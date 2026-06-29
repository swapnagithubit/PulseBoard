import React, { useState } from "react";
import { Code, Copy, Check, Terminal, ExternalLink, RefreshCw, FileText } from "lucide-react";

const Integration = () => {
  const [copied, setCopied] = useState(false);
  const [copiedBtn, setCopiedBtn] = useState(false);
  const [copiedAttr, setCopiedAttr] = useState(false);

  const trackerSnippet = `<!-- PulseBoard Real-Time Tracker Snippet -->
<script 
  src="http://localhost:5000/tracker.js" 
  data-app-id="pulseboard-analytics-demo" 
  data-host="http://localhost:5000">
</script>`;

  const apiSnippet = `// Trigger custom events dynamically via Javascript
if (window.PulseBoard) {
  // Track a customized click or navigation event
  window.PulseBoard.track('click', { page: '/products', amount: 0 });

  // Track a checkout purchase
  window.PulseBoard.track('purchase', { page: '/checkout', amount: 249 });

  // Track a new user registration signup
  window.PulseBoard.track('signup', { page: '/register' });
}`;

  const attributesSnippet = `<!-- HTML Declarative Auto-Tracking -->
<button 
  data-pb-track="purchase" 
  data-pb-amount="199" 
  data-pb-page="/checkout">
  Buy Premium Package ($199)
</button>

<button 
  data-pb-track="signup" 
  data-pb-page="/join">
  Register Account
</button>`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (type === 'api') {
      setCopiedBtn(true);
      setTimeout(() => setCopiedBtn(false), 2000);
    } else if (type === 'attr') {
      setCopiedAttr(true);
      setTimeout(() => setCopiedAttr(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl flex items-center space-x-3.5">
        <div className="bg-indigo-600/10 border border-indigo-500/20 p-2.5 rounded-xl text-indigo-400">
          <Terminal size={20} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Website Integration SDK</h3>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">
            Integrate PulseBoard tracker on any external website to capture real-time analytics events.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Integration Setup Guide (Col-Span-2) */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Code size={16} className="text-indigo-400" /> Web Ingestion Snippet
          </h4>
          
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Copy and paste this script tag inside the <code>&lt;head&gt;</code> or bottom of the <code>&lt;body&gt;</code> of your website. It will automatically initialize, track page loads, and capture elements tagged with tracking attributes.
          </p>

          <div className="relative group rounded-xl overflow-hidden bg-black/40 border border-white/5 font-mono text-xs">
            <div className="flex justify-between items-center bg-white/5 px-4 py-2 border-b border-white/5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>tracker HTML snippet</span>
              <button 
                onClick={() => copyToClipboard(trackerSnippet, 'script')}
                className="flex items-center gap-1 hover:text-white transition duration-150"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-indigo-300 leading-relaxed">
              {trackerSnippet}
            </pre>
          </div>

          <div className="border-t border-white/5 pt-6 space-y-4">
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" /> Declarative HTML Attributes
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              You can track elements (buttons, links, forms) without writing any JavaScript by adding the <code>data-pb-track</code>, <code>data-pb-amount</code>, and <code>data-pb-page</code> data attributes.
            </p>

            <div className="relative group rounded-xl overflow-hidden bg-black/40 border border-white/5 font-mono text-xs">
              <div className="flex justify-between items-center bg-white/5 px-4 py-2 border-b border-white/5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <span>declarative html tags</span>
                <button 
                  onClick={() => copyToClipboard(attributesSnippet, 'attr')}
                  className="flex items-center gap-1 hover:text-white transition duration-150"
                >
                  {copiedAttr ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copiedAttr ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-emerald-400 leading-relaxed">
                {attributesSnippet}
              </pre>
            </div>
          </div>
        </div>

        {/* Developer Sandbox Guide */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <RefreshCw size={16} className="text-indigo-400" /> Custom JS Tracker API
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Trigger fine-grained analytical metrics dynamically inside your site's React, Vue, or Vanilla JS logic.
            </p>
          </div>

          <div className="relative group rounded-xl overflow-hidden bg-black/40 border border-white/5 font-mono text-xs flex-1 flex flex-col border-white/10">
            <div className="flex justify-between items-center bg-white/5 px-4 py-2 border-b border-white/5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>javascript sdk functions</span>
              <button 
                onClick={() => copyToClipboard(apiSnippet, 'api')}
                className="flex items-center gap-1 hover:text-white transition duration-150"
              >
                {copiedBtn ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiedBtn ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-amber-300 leading-relaxed flex-grow whitespace-pre-wrap select-all font-medium">
              {apiSnippet}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed font-medium">
            💡 <strong>Testing Sandbox:</strong> Simply copy the script snippet, paste it in any local HTML file on your computer, load it in your browser, click your configured buttons, and watch events stream onto this dashboard instantly!
          </div>
        </div>

      </div>
    </div>
  );
};

export default Integration;
