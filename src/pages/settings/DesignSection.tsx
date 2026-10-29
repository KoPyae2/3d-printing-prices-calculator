import { useState } from 'react'
import { useAppStore } from '../../store/store.ts'
import { addCadTier, removeCadTier, updateCadTier } from '../../store/actions.ts'
import { useToast } from '../../hooks/useToast.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { NumberField } from '../../components/ui/NumberField.tsx'
import { TextField } from '../../components/ui/TextField.tsx'
import { TextArea } from '../../components/ui/TextArea.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { Icon } from '../../components/icons/Icons.tsx'
import { formatAmount } from '../../lib/money.ts'

interface Draft {
  id: string | null
  name: string
  price: number
  note: string
}

const EMPTY: Draft = { id: null, name: '', price: 0, note: '' }

export function DesignSection() {
  const cadTiers = useAppStore((s) => s.cadTiers)
  const symbol = useAppStore((s) => s.profile.currencySymbol || s.profile.currencyCode)
  const { show } = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const openNew = () => setDraft({ ...EMPTY })
  const openEdit = (id: string) => {
    const tier = cadTiers.find((item) => item.id === id)
    if (tier) setDraft({ ...tier })
  }

  const save = () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      show('Give the tier a name', 'danger')
      return
    }
    const payload = { name, price: draft.price, note: draft.note.trim() }
    if (draft.id) {
      updateCadTier(draft.id, payload)
      show('Design fee saved', 'success')
    } else {
      addCadTier(payload)
      show('Design fee added', 'success')
    }
    setDraft(null)
  }

  return (
    <SettingsSectionLayout
      title="CAD & design fees"
      subtitle="Flat fees for 3D modelling, STL repair or custom design work."
      actions={
        <Button variant="accent" size="sm" onClick={openNew} icon={<Icon name="plus" size={14} />}>
          Add tier
        </Button>
      }
    >
      {draft && !draft.id ? (
        <div className="panel">
          <header className="panel-head">
            <h2 className="panel-title">New design tier</h2>
          </header>
          <div className="editor">
            <div className="grid-2">
              <TextField
                label="Tier name"
                value={draft.name}
                onChange={(value) => setDraft({ ...draft, name: value })}
                placeholder="Simple design"
                maxLength={160}
                autoFocus
              />
              <NumberField
                label="Fee"
                value={draft.price}
                onChange={(value) => setDraft({ ...draft, price: value })}
                suffix={symbol}
                min={0}
                max={100_000_000}
                step={1000}
                integer
              />
            </div>
            <TextArea
              label="Description"
              value={draft.note}
              onChange={(value) => setDraft({ ...draft, note: value })}
              placeholder="What the customer gets for this fee."
              rows={2}
            />
            <div className="editor-foot">
              <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={save}>
                Add fee
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {cadTiers.length === 0 && !draft ? (
        <EmptyState
          icon="cube"
          title="No design fees"
          text="Add a free tier for customer-supplied STLs, then price modelling work from there."
          action={
            <Button variant="accent" onClick={openNew}>
              Add fee
            </Button>
          }
        />
      ) : (
        <div className="group">
          <div className="list">
            {cadTiers.map((tier) => {
              const editing = draft?.id === tier.id
              return (
                <div key={tier.id}>
                  <div className="list-row">
                    <button type="button" className="list-main" onClick={() => (editing ? setDraft(null) : openEdit(tier.id))}>
                      <span className="list-title">{tier.name}</span>
                      <span className="list-sub">{tier.note || 'No description'}</span>
                    </button>
                    <span className="nav-badge">{tier.price === 0 ? 'Free' : `${formatAmount(tier.price)} ${symbol}`}</span>
                    <div className="list-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm"
                        aria-label={`${editing ? 'Close' : 'Edit'} ${tier.name}`}
                        onClick={() => (editing ? setDraft(null) : openEdit(tier.id))}
                      >
                        <Icon name={editing ? 'chevronDown' : 'edit'} size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm icon-btn-danger"
                        aria-label={`Delete ${tier.name}`}
                        onClick={() => setPendingDelete(tier.id)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                  {editing && draft ? (
                    <div className="editor">
                      <div className="grid-2">
                        <TextField
                          label="Tier name"
                          value={draft.name}
                          onChange={(value) => setDraft({ ...draft, name: value })}
                          placeholder="Simple design"
                          maxLength={160}
                          autoFocus
                        />
                        <NumberField
                          label="Fee"
                          value={draft.price}
                          onChange={(value) => setDraft({ ...draft, price: value })}
                          suffix={symbol}
                          min={0}
                          max={100_000_000}
                          step={1000}
                          integer
                        />
                      </div>
                      <TextArea
                        label="Description"
                        value={draft.note}
                        onChange={(value) => setDraft({ ...draft, note: value })}
                        placeholder="What the customer gets for this fee."
                        rows={2}
                      />
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
        title="Delete design fee?"
        message="This removes the tier from the calculator."
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeCadTier(pendingDelete)
            if (draft?.id === pendingDelete) setDraft(null)
          }
          setPendingDelete(null)
          show('Design fee deleted')
        }}
      />
    </SettingsSectionLayout>
  )
}
