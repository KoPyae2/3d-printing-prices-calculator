import { useState } from 'react'
import { useAppStore } from '../../store/store.ts'
import { addAddon, removeAddon, updateAddon } from '../../store/actions.ts'
import { useToast } from '../../hooks/useToast.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { NumberField } from '../../components/ui/NumberField.tsx'
import { TextField } from '../../components/ui/TextField.tsx'
import { SelectField } from '../../components/ui/SelectField.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { Icon } from '../../components/icons/Icons.tsx'
import { formatAmount } from '../../lib/money.ts'
import { ADDON_CATEGORIES, ADDON_CATEGORY_LABEL, type AddonCategory } from '../../lib/types.ts'

interface Draft {
  id: string | null
  name: string
  price: number
  category: AddonCategory
}

const EMPTY: Draft = { id: null, name: '', price: 0, category: 'packaging' }

const CATEGORY_OPTIONS = ADDON_CATEGORIES.map((value) => ({ value, label: ADDON_CATEGORY_LABEL[value] }))

export function AddonsSection() {
  const addons = useAppStore((s) => s.addons)
  const symbol = useAppStore((s) => s.profile.currencySymbol || s.profile.currencyCode)
  const { show } = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const openNew = () => setDraft({ ...EMPTY })
  const openEdit = (id: string) => {
    const addon = addons.find((item) => item.id === id)
    if (addon) setDraft({ id: addon.id, name: addon.name, price: addon.price, category: addon.category })
  }

  const save = () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      show('Give the extra a name', 'danger')
      return
    }
    const payload = { name, price: draft.price, category: draft.category }
    if (draft.id) {
      updateAddon(draft.id, payload)
      show('Extra saved', 'success')
    } else {
      addAddon(payload)
      show('Extra added', 'success')
    }
    setDraft(null)
  }

  const fields = (d: Draft) => (
    <>
      <TextField
        label="Name"
        value={d.name}
        onChange={(value) => setDraft({ ...d, name: value })}
        placeholder="Gift bag"
        maxLength={160}
        autoFocus
      />
      <div className="grid-2">
        <NumberField
          label="Price"
          value={d.price}
          onChange={(value) => setDraft({ ...d, price: value })}
          suffix={symbol}
          min={0}
          max={100_000_000}
          step={500}
          integer
        />
        <SelectField
          label="Category"
          value={d.category}
          options={CATEGORY_OPTIONS}
          onChange={(value) => setDraft({ ...d, category: value as AddonCategory })}
        />
      </div>
    </>
  )

  return (
    <SettingsSectionLayout
      title="Extras & packaging"
      subtitle="Packaging, finishing and hardware options customers can add to a print."
      actions={
        <Button variant="accent" size="sm" onClick={openNew} icon={<Icon name="plus" size={14} />}>
          Add extra
        </Button>
      }
    >
      {draft && !draft.id ? (
        <div className="panel">
          <header className="panel-head">
            <h2 className="panel-title">New extra item</h2>
          </header>
          <div className="editor">
            {fields(draft)}
            <div className="editor-foot">
              <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={save}>
                Add extra
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {addons.length === 0 && !draft ? (
        <EmptyState
          icon="box"
          title="No extras"
          text="Add packaging, finishing or hardware you sell alongside prints."
          action={
            <Button variant="accent" onClick={openNew}>
              Add extra
            </Button>
          }
        />
      ) : (
        <div className="group">
          <div className="list">
            {addons.map((addon) => {
              const editing = draft?.id === addon.id
              return (
                <div key={addon.id}>
                  <div className="list-row">
                    <button type="button" className="list-main" onClick={() => (editing ? setDraft(null) : openEdit(addon.id))}>
                      <span className="list-title">{addon.name}</span>
                      <span className="list-sub">{ADDON_CATEGORY_LABEL[addon.category]}</span>
                    </button>
                    <span className="nav-badge">
                      {formatAmount(addon.price)} {symbol}
                    </span>
                    <div className="list-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm"
                        aria-label={`${editing ? 'Close' : 'Edit'} ${addon.name}`}
                        onClick={() => (editing ? setDraft(null) : openEdit(addon.id))}
                      >
                        <Icon name={editing ? 'chevronDown' : 'edit'} size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm icon-btn-danger"
                        aria-label={`Delete ${addon.name}`}
                        onClick={() => setPendingDelete(addon.id)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                  {editing && draft ? (
                    <div className="editor">
                      {fields(draft)}
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
        title="Delete extra?"
        message="This removes the item from your extras list."
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            removeAddon(pendingDelete)
            if (draft?.id === pendingDelete) setDraft(null)
          }
          setPendingDelete(null)
          show('Extra deleted')
        }}
      />
    </SettingsSectionLayout>
  )
}
