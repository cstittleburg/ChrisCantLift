import { useState } from 'react';
import { Check, X } from 'lucide-react';

export default function SetConfirmCard({ pendingSet, exercise, onConfirm, onCancel }) {
  const [reps, setReps] = useState(pendingSet.reps?.toString() || '');
  const [weight, setWeight] = useState(pendingSet.weight?.toString() || '');
  const [rir, setRir] = useState(pendingSet.rir?.toString() || '');
  const [showRirInput] = useState(!!pendingSet.needsRir);

  const handleConfirm = () => {
    if (!reps) return;
    if (showRirInput && rir === '') return;

    onConfirm({
      reps: parseInt(reps),
      weight: weight ? parseFloat(weight) : null,
      rir: rir !== '' ? parseInt(rir) : undefined,
    });
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-blue-700/50">
      <p className="text-xs font-semibold text-blue-400 mb-3">Confirm Set</p>

      {pendingSet.raw && (
        <p className="text-xs text-gray-500 mb-3 italic">"{pendingSet.raw}"</p>
      )}

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Reps</label>
          <input
            type="number"
            value={reps}
            onChange={e => setReps(e.target.value)}
            className="w-full bg-gray-700 text-white font-bold text-lg rounded-lg px-3 py-2 text-center"
            autoFocus
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full bg-gray-700 text-white font-bold text-lg rounded-lg px-3 py-2 text-center"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">RIR {showRirInput && <span className="text-red-400">*</span>}</label>
          <input
            type="number"
            value={rir}
            onChange={e => setRir(e.target.value)}
            placeholder={showRirInput ? 'req.' : 'opt.'}
            className={`w-full bg-gray-700 text-white font-bold text-lg rounded-lg px-3 py-2 text-center ${showRirInput && rir === '' ? 'border border-red-500' : ''}`}
          />
        </div>
      </div>

      {showRirInput && rir === '' && (
        <p className="text-xs text-red-400 mb-2">RIR required — how many reps left in the tank?</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"
        >
          <X size={16} /> Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1"
        >
          <Check size={16} /> Save Set
        </button>
      </div>
    </div>
  );
}
