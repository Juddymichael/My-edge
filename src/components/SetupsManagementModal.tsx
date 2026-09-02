import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Layers, BookOpen, AlertCircle } from 'lucide-react';
import { Setup } from '../types/setup';
import { useSetups } from '../hooks/useSetups';

interface SetupsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupsManagementModal: React.FC<SetupsManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setups, addOrUpdateSetup, toggleSetup, removeSetup, isLoading } = useSetups();
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [category, setCategory] = useState<'FVG' | 'Market Structure' | 'Order Flow' | 'Liquidity' | 'Reversal' | string>('FVG');
  const [description, setDescription] = useState('');
  const [ruleInput, setRuleInput] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!ruleInput.trim()) return;
    setRules([...rules, ruleInput.trim()]);
    setRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Setup name is required');
      return;
    }

    const newSetup: Setup = {
      id: `setup-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      shortName: (shortName.trim() || name.trim()).slice(0, 15),
      category: category.trim() || 'General',
      description: description.trim(),
      rules,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await addOrUpdateSetup(newSetup);
      setIsCreating(false);
      setName('');
      setShortName('');
      setDescription('');
      setRules([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save setup');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      id="modal-setups-management"
    >
      <div className="bg-white dark:bg-[#101827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Trading Setups Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Extensible setups catalog with execution rules and statistical mapping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Action to create new setup */}
          {!isCreating ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Registered Setups ({setups.length})
                </span>
              </div>
              <button
                id="btn-add-setup-toggle"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Setup</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  Create New Trading Setup
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Setup Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Silver Bullet 2024"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Short Tag / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SB 2024"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FVG">Fair Value Gap (FVG)</option>
                    <option value="Market Structure">Market Structure / MSS</option>
                    <option value="Order Flow">Order Flow / Order Block</option>
                    <option value="Liquidity">Liquidity Sweep</option>
                    <option value="Reversal">Reversal / SMT</option>
                    <option value="Trend">Trend Continuation</option>
                    <option value="General">General / Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 - 11:00 AM NY killzone liquidity sweep"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-normal"
                  />
                </div>
              </div>

              {/* Execution Rules List */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Execution Checklist Rules
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Wait for 5m displacement candle closing above high"
                    value={ruleInput}
                    onChange={(e) => setRuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-normal"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Add Rule
                  </button>
                </div>

                {rules.length > 0 && (
                  <ul className="space-y-1 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    {rules.map((rule, idx) => (
                      <li key={idx} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-normal">{rule}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="text-rose-500 hover:text-rose-700 text-[10px] cursor-pointer font-medium"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer"
                >
                  Save Setup
                </button>
              </div>
            </form>
          )}

          {/* Setups Cards */}
          <div className="space-y-3">
            {setups.map((setup) => (
              <div
                key={setup.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {setup.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                        {setup.shortName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {setup.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                      {setup.description || 'No description provided.'}
                    </p>

                    {setup.rules && setup.rules.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-indigo-400" />
                          Rules Checklist:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {setup.rules.map((rule, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                            >
                              <span className="text-indigo-500 font-medium text-[10px] mt-0.5">•</span>
                              <span className="font-normal">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleSetup(setup.id, !setup.enabled)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer ${
                        setup.enabled
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {setup.enabled ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => removeSetup(setup.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Delete Setup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

