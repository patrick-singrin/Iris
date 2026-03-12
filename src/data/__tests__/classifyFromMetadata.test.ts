import { describe, it, expect } from 'vitest'
import { classifyFromMetadata } from '../story-classification'
import { createEmptyMetadata, type Phase1Metadata } from '../classification-questions'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function meta(overrides: Partial<Phase1Metadata>): Phase1Metadata {
  return { ...createEmptyMetadata(), ...overrides }
}

// ---------------------------------------------------------------------------
// Severity rules (Decision #24, architecture-evolution.md §3)
// ---------------------------------------------------------------------------

describe('classifyFromMetadata — severity rules', () => {
  describe('CRITICAL', () => {
    it('security = yes → CRITICAL regardless of category', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: true, scope: 'all' }))
      expect(r.severity).toBe('CRITICAL')
    })

    it('security = yes on capability → CRITICAL', () => {
      const r = classifyFromMetadata(meta({ category: 'capability', security: true, scope: 'some' }))
      expect(r.severity).toBe('CRITICAL')
    })

    it('platform_down = yes → CRITICAL', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: false, platform_down: true, scope: 'all' }))
      expect(r.severity).toBe('CRITICAL')
    })

    it('security takes priority over platform_down', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: true, platform_down: true, scope: 'all' }))
      expect(r.severity).toBe('CRITICAL')
    })
  })

  describe('HIGH', () => {
    it('core_value + scope=all → HIGH', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'all' }))
      expect(r.severity).toBe('HIGH')
    })

    it('core_value + scope=some → HIGH', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'some' }))
      expect(r.severity).toBe('HIGH')
    })

    it('core_value + scope=one → HIGH', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'one' }))
      expect(r.severity).toBe('HIGH')
    })
  })

  describe('MEDIUM', () => {
    it('capability + scope=all → MEDIUM', () => {
      const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'all' }))
      expect(r.severity).toBe('MEDIUM')
    })

    it('capability + scope=some → MEDIUM', () => {
      const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'some' }))
      expect(r.severity).toBe('MEDIUM')
    })

    it('capability + scope=one → MEDIUM', () => {
      const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'one' }))
      expect(r.severity).toBe('MEDIUM')
    })
  })

  describe('LOW', () => {
    it('core_value + scope=none → LOW', () => {
      const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'none' }))
      expect(r.severity).toBe('LOW')
    })

    it('capability + scope=none → LOW', () => {
      const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'none' }))
      expect(r.severity).toBe('LOW')
    })
  })
})

// ---------------------------------------------------------------------------
// Channel rules (architecture-evolution.md §3 + audit §2 scope qualifier)
// ---------------------------------------------------------------------------

describe('classifyFromMetadata — channel rules', () => {
  it('CRITICAL → Banner + Dashboard + E-Mail + Status Page', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: true, scope: 'all' }))
    expect(r.channels).toEqual(['Banner', 'Dashboard', 'E-Mail', 'Status Page'])
  })

  it('HIGH + scope=all → Banner + Dashboard + E-Mail', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'all' }))
    expect(r.channels).toEqual(['Banner', 'Dashboard', 'E-Mail'])
  })

  it('HIGH + scope=one → Dashboard + E-Mail (no Banner — audit recommendation)', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'one' }))
    expect(r.channels).not.toContain('Banner')
    expect(r.channels).toContain('Dashboard')
    expect(r.channels).toContain('E-Mail')
  })

  it('HIGH + scope=some → Banner + Dashboard + E-Mail', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'some' }))
    expect(r.channels).toEqual(['Banner', 'Dashboard', 'E-Mail'])
  })

  it('MEDIUM → Dashboard + E-Mail', () => {
    const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'all' }))
    expect(r.channels).toEqual(['Dashboard', 'E-Mail'])
  })

  it('LOW → Dashboard', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'none' }))
    expect(r.channels).toEqual(['Dashboard'])
  })
})

// ---------------------------------------------------------------------------
// Management type classification (6 information types)
// ---------------------------------------------------------------------------

describe('classifyFromMetadata — management types', () => {
  it('form_field=yes → Validation Messages (Inline)', () => {
    const r = classifyFromMetadata(meta({ category: 'management', mgmt_form_field: true }))
    expect(r.informationType).toBe('Validation Messages')
    expect(r.severity).toBeNull()
    expect(r.channels).toEqual(['Inline'])
  })

  it('trigger=user, success=false → Error & Warnings', () => {
    const r = classifyFromMetadata(meta({
      category: 'management', mgmt_form_field: false,
      mgmt_trigger: 'user', mgmt_success: false,
    }))
    expect(r.informationType).toBe('Error & Warnings')
    expect(r.severity).toBeNull()
    expect(r.channels).toEqual(['Inline', 'Toast'])
  })

  it('trigger=user, success=true, persistence=true → Transactional Confirmation', () => {
    const r = classifyFromMetadata(meta({
      category: 'management', mgmt_form_field: false,
      mgmt_trigger: 'user', mgmt_success: true, mgmt_persistence: true,
    }))
    expect(r.informationType).toBe('Transactional Confirmation')
    expect(r.channels).toEqual(['Toast', 'Dashboard'])
  })

  it('trigger=user, success=true, persistence=false → Feedback', () => {
    const r = classifyFromMetadata(meta({
      category: 'management', mgmt_form_field: false,
      mgmt_trigger: 'user', mgmt_success: true, mgmt_persistence: false,
    }))
    expect(r.informationType).toBe('Feedback')
    expect(r.channels).toEqual(['Toast'])
  })

  it('trigger=system, ongoing=true → Status Display', () => {
    const r = classifyFromMetadata(meta({
      category: 'management', mgmt_form_field: false,
      mgmt_trigger: 'system', mgmt_ongoing: true,
    }))
    expect(r.informationType).toBe('Status Display')
    expect(r.channels).toEqual(['Dashboard'])
  })

  it('trigger=system, ongoing=false → Notification (LOW)', () => {
    const r = classifyFromMetadata(meta({
      category: 'management', mgmt_form_field: false,
      mgmt_trigger: 'system', mgmt_ongoing: false,
    }))
    expect(r.informationType).toBe('Notification')
    expect(r.severity).toBe('LOW')
    expect(r.channels).toEqual(['Dashboard'])
  })
})

// ---------------------------------------------------------------------------
// Trigger strings
// ---------------------------------------------------------------------------

describe('classifyFromMetadata — trigger', () => {
  it('core_value + all → "Core product — all services"', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'all' }))
    expect(r.trigger).toBe('Core product — all services')
  })

  it('capability + some → "Platform feature — some services"', () => {
    const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'some' }))
    expect(r.trigger).toBe('Platform feature — some services')
  })

  it('core_value + none → "Core product — informational"', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'none' }))
    expect(r.trigger).toBe('Core product — informational')
  })

  it('management + form field → "Form field validation"', () => {
    const r = classifyFromMetadata(meta({ category: 'management', mgmt_form_field: true }))
    expect(r.trigger).toBe('Form field validation')
  })
})

// ---------------------------------------------------------------------------
// Type derivation for core/capability
// ---------------------------------------------------------------------------

describe('classifyFromMetadata — type', () => {
  it('core_value always produces Notification type', () => {
    const r = classifyFromMetadata(meta({ category: 'core_value', security: false, scope: 'all' }))
    expect(r.informationType).toBe('Notification')
  })

  it('capability always produces Notification type', () => {
    const r = classifyFromMetadata(meta({ category: 'capability', security: false, scope: 'some' }))
    expect(r.informationType).toBe('Notification')
  })
})
