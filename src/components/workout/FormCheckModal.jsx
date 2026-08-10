import { useState, useRef } from 'react';
import { X, Upload, Loader, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ANTHROPIC_API_KEY_STORAGE = 'fitness_anthropic_key';

export default function FormCheckModal({ exercise, onClose }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(ANTHROPIC_API_KEY_STORAGE) || '');
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const handleAnalyze = async () => {
    if (!videoFile || !apiKey) return;
    setLoading(true);
    setError(null);

    try {
      // Convert video to base64
      const base64 = await fileToBase64(videoFile);

      localStorage.setItem(ANTHROPIC_API_KEY_STORAGE, apiKey);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze the form in this video for the exercise: ${exercise.name}.

User context: 41M, 249lbs, 10 years experience, knee arthritis, elbow tendonitis flare-ups, history of lower back injury from poor deadlift form.

Provide structured feedback in this exact JSON format:
{
  "looksGood": ["list of good form cues observed"],
  "needsAttention": ["list of form issues to address"],
  "injuryRiskFlags": ["any injury risk flags, especially lower back"],
  "confidence": "high|medium|low",
  "summary": "1-2 sentence overall assessment",
  "readyToAdvanceWeight": true|false
}`,
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: videoFile.type,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content[0].text;

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setFeedback(JSON.parse(jsonMatch[0]));
      } else {
        setFeedback({ summary: text, looksGood: [], needsAttention: [], injuryRiskFlags: [], confidence: 'low' });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Form Check</h2>
          <button onClick={onClose} className="text-gray-500"><X size={22} /></button>
        </div>

        <p className="text-sm text-gray-400 mb-4">{exercise.name}</p>

        {!apiKey && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">Anthropic API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {!feedback && !loading && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-500 mb-4"
            >
              <Upload size={24} />
              <span className="text-sm">{videoFile ? videoFile.name : 'Upload video or image'}</span>
            </button>
            <input ref={fileRef} type="file" accept="video/*,image/*" onChange={handleFileChange} className="hidden" />

            {error && (
              <p className="text-red-400 text-sm mb-3">{error}</p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!videoFile || !apiKey}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
            >
              Analyze Form
            </button>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader size={32} className="animate-spin text-purple-400" />
            <p className="text-gray-400 text-sm">Analyzing your form...</p>
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">{feedback.summary}</p>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ml-2 flex-shrink-0 ${
                feedback.confidence === 'high' ? 'bg-green-900 text-green-300' :
                feedback.confidence === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {feedback.confidence} confidence
              </span>
            </div>

            {feedback.looksGood?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                  <CheckCircle size={12} /> Looks Good
                </p>
                <ul className="space-y-1">
                  {feedback.looksGood.map((item, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.needsAttention?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-yellow-400 mb-2 flex items-center gap-1">
                  <Info size={12} /> Needs Attention
                </p>
                <ul className="space-y-1">
                  {feedback.needsAttention.map((item, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.injuryRiskFlags?.length > 0 && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3">
                <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Injury Risk
                </p>
                <ul className="space-y-1">
                  {feedback.injuryRiskFlags.map((item, i) => (
                    <li key={i} className="text-xs text-red-300 flex items-start gap-2">
                      <span className="mt-0.5">⚠</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setFeedback(null)}
              className="w-full bg-gray-800 text-gray-300 py-3 rounded-xl text-sm font-semibold"
            >
              Analyze Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
