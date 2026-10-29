import { useState } from 'react'
import { useAppStore } from '../../store/store.ts'
import { addFilament, removeFilament, updateFilament } from '../../store/actions.ts'
import { useToast } from '../../hooks/useToast.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { NumberField } from '../../components/ui/NumberField.tsx'
import { TextField } from '../../components/ui/TextField.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { Icon } from '../../components/icons/Icons.tsx'
import { formatAmount } from '../../lib/money.ts'

interface Draft {
  id: string | null
  name: string
  brand: string
  pricePerGram: number
}

const EMPTY: Draft = { id: null, name: '', brand: '', pricePerGram: 200 }

export function FilamentsSection() {
  const filaments = useAppStore((s) => s.filaments)
  const symbol = useAppStore((s) => s.profile.currencySymbol || s.profile.currencyCode)
  const { show } = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const openNew = () => setDraft({ ...EMPTY })
  const openEdit = (id: string) => {
    const filament = filaments.find((item) => item.id === id)
    if (filament) setDraft({ ...filament })
  }

  const save = () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      show('Give the filament a name', 'danger')
      return
    }
    if (draft.pricePerGram < 0) {
      show('Enter a valid price per gram', 'danger')
      return
    }
    const payload = {
      name,
      brand: draft.brand.trim(),
      pricePerGram: draft.pricePerGram,
    }
    if (draft.id) {
      updateFilament(draft.id, payload)
      show('Filament saved', 'success')
    } else {
      addFilament(payload)
      show('Filament added', 'success')
    }
    setDraft(null)
  }

  return (
    <SettingsSectionLayout
      title="Filaments"
      subtitle="Set your 1g selling rate (including filament profit) for each material."
      actions={
        <Button variant="accent" size="sm" onClick={openNew} icon={<Icon name="plus" size={14} />}>
          Add filament
        </Button>
      }
    >
      {draft && !draft.id ? (
        <div className="panel">
          <header className="panel-head">
            <h2 className="panel-title">New filament</h2>
          </header>
          <div className="editor">
            <div className="grid-2">
              <TextField
                label="Material name"
                value={draft.name}
                onChange={(value) => setDraft({ ...draft, name: value })}
                placeholder="PLA+"
                maxLength={120}
                autoFocus
              />
              <TextField
                label="Brand"
                value={draft.brand}
                onChange={(value) => setDraft({ ...draft, brand: value })}
                placeholder="eSun, Generic…"
                maxLength={80}
              />
            </div>
            <NumberField
              label="Selling price per 1g (profit included)"
              value={draft.pricePerGram}
              onChange={(value) => setDraft({ ...draft, pricePerGram: value })}
              suffix={`${symbol}/g`}
              min={0}
              max={1_000_000}
              step={10}
              integer
            />
            <p className="field-hint">
              {draft.pricePerGram > 0
                ? `Example: 100g print = ${formatAmount(draft.pricePerGram * 100)} ${symbol} filament cost.`
                : 'Enter the 1g selling rate for this filament.'}
            </p>
            <div className="editor-foot">
              <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={save}>
                Add filament
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {filaments.length === 0 && !draft ? (
        <EmptyState
          icon="layers"
          title="No filaments"
          text="Add your filaments with their per-gram selling price."
          action={
            <Button variant="accent" onClick={openNew}>
              Add filament
            </Button>
          }
        />
      ) : (
        <div className="group">
          <div className="list">
            {filaments.map((filament) => {
              const editing = draft?.id === filament.id
              const perGram = filament.pricePerGram
              const brandLabel = filament.brand && filament.brand.toLowerCase() !== 'generic' ? ` · ${filament.brand}` : ''
              return (
                <div key={filament.id}>
                  <div className="list-row">
                    <button type="button" className="list-main" onClick={() => (editing ? setDraft(null) : openEdit(filament.id))}>
                      <span className="list-title">
                        {filament.name}
                        <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{brandLabel}</span>
                      </span>
                      <span className="list-sub">
                        100 g = {formatAmount(perGram * 100)} {symbol}
                      </span>
                    </button>
                    <span className="nav-badge">
                      {formatAmount(perGram)} {symbol}/g
                    </span>
                    <div className="list-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm"
                        aria-label={`${editing ? 'Close' : 'Edit'} ${filament.name}`}
                        onClick={() => (editing ? setDraft(null) : openEdit(filament.id))}
                      >
                        <Icon name={editing ? 'chevronDown' : 'edit'} size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm icon-btn-danger"
                        aria-label={`Delete ${filament.name}`}
                        onClick={() => setPendingDelete(filament.id)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>

                  {editing && draft ? (
                    <div className="editor">
                      <div className="grid-2">
                        <TextField
                          label="Material name"
                          value={draft.name}
                          onChange={(value) => setDraft({ ...draft, name: value })}
                          placeholder="PLA"
                          maxLength={120}
                          autoFocus
                        />
                        <TextField
                          label="Brand"
                          value={draft.brand}
                          onChange={(value) => setDraft({ ...draft, brand: value })}
                          placeholder="eSun, Generic…"
                          maxLength={80}
                        />
                      </div>
                      <NumberField
                        label="Selling price per 1g (profit included)"
                        value={draft.pricePerGram}
                        onChange={(value) => setDraft({ ...draft, pricePerGram: value })}
                        suffix={`${symbol}/g`}
                        min={0}
                        max={1_000_000}
                        step={10}
                        integer
                      />
                      <p className="field-hint">
                        {draft.pricePerGram > 0
                          ? `Example: 100g print = ${formatAmount(draft.pricePerGram * 100)} ${symbol} filament cost.`
                          : 'Enter the 1g selling rate for this filament.'}
                      </p>
                      <div className="editor-foot">
                        <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
                          Cancel
                        </Button>
                        <Button variant="accent" size="sm" onClick={save}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete filament?"
        message="This removes the spool from your material catalog."
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeFilament(pendingDelete)
            if (draft?.id === pendingDelete) setDraft(null)
          }
          setPendingDelete(null)
          show('Filament deleted')
        }}
      />
    </SettingsSectionLayout>
  )
}
