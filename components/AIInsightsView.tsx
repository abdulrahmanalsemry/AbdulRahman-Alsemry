
import React, { useState, useEffect } from 'react';
import { Quote, Invoice, OperationalExpense, Salesperson } from '../types';
import { getBusinessInsights } from '../services/geminiService';
import { BrainCircuit, Sparkles, RefreshCcw, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, ChevronRight } from 'lucide-react';


interface Props {
  quotes: Quote[];
  invoices: Invoice[];
  expenses: OperationalExpense[];
  team: Salesperson[];
}

/**
 * A custom Markdown-to-JSX renderer to handle Gemini's output
 * without showing raw hashtags or asterisks.
 */
const FormattedReport: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="space-y-3 my-4 ml-2">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const parseInlineFormatting = (text: string) => {
    // Replace **text** with bold spans and *text* with italics
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-700 dark:text-slate-400">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Headers
    if (trimmedLine.startsWith('###')) {
      flushList(index);
      elements.push(
        <h4 key={index} className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] mt-8 mb-3 flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-600 dark:bg-indigo-500 rounded-full"></div>
          {parseInlineFormatting(trimmedLine.replace(/^###\s*/, ''))}
        </h4>
      );
    } else if (trimmedLine.startsWith('##')) {
      flushList(index);
      elements.push(
        <h3 key={index} className="text-lg font-black text-slate-800 dark:text-slate-100 mt-10 mb-4 border-l-4 border-indigo-200 dark:border-indigo-800 pl-4">
          {parseInlineFormatting(trimmedLine.replace(/^##\s*/, ''))}
        </h3>
      );
    } else if (trimmedLine.startsWith('#')) {
      flushList(index);
      elements.push(
        <h2 key={index} className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-12 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-2">
          {parseInlineFormatting(trimmedLine.replace(/^#\s*/, ''))}
        </h2>
      );
    }
    // List items
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || (trimmedLine.match(/^\d+\.\s/) && !trimmedLine.includes(':'))) {
      const contentText = trimmedLine.replace(/^([-*]|\d+\.)\s*/, '');
      listItems.push(
        <li key={index} className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
          <div className="mt-1.5 shrink-0">
            <ChevronRight size={14} className="text-indigo-400" />
          </div>
          <span className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {parseInlineFormatting(contentText)}
          </span>
        </li>
      );
    }
    // Regular paragraphs
    else if (trimmedLine.length > 0) {
      flushList(index);
      elements.push(
        <p key={index} className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
          {parseInlineFormatting(trimmedLine)}
        </p>
      );
    }
    // Empty lines
    else {
      flushList(index);
    }
  });

  flushList(lines.length);

  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-4xl mx-auto">{elements}</div>;
};

const AIInsightsView: React.FC<Props> = ({ quotes, invoices, expenses, team }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInsight = async () => {
    setLoading(true);
    const text = await getBusinessInsights(quotes, invoices, expenses, team);
    setInsight(text || '');
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="bg-white/20 p-6 rounded-2xl backdrop-blur-md relative z-10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
          <BrainCircuit size={48} className="text-white" />
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h2 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-2 tracking-tight">
            AI Business Intelligence <Sparkles size={20} className="text-amber-300 animate-pulse" />
          </h2>
          <p className="text-indigo-100 max-w-xl font-medium">
            Advanced neural analysis of your revenue, conversions, and team performance metrics.
          </p>
        </div>
        <button 
          onClick={fetchInsight}
          disabled={loading}
          className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50 shadow-xl relative z-10 active:scale-95"
        >
          {/* Fix: Changed RefreshCw to RefreshCcw */}
          {loading ? <RefreshCcw className="animate-spin" size={20} /> : <RefreshCcw size={20} />}
          Generate Insights
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400"><TrendingUp size={24} /></div>
          <div>
            <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest mb-1">Growth Index</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Monthly conversion trajectory.</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400"><AlertTriangle size={24} /></div>
          <div>
            <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest mb-1">Risk Factors</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Overhead efficiency alerts.</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400"><Lightbulb size={24} /></div>
          <div>
            <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest mb-1">Strategic Tips</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Revenue optimization suggestions.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 flex flex-col items-center justify-center">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-100 dark:border-indigo-900/50 border-t-indigo-600 rounded-full animate-spin"></div>
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" size={32} />
            </div>
            <p className="mt-6 font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[10px]">AI Business Analyst is processing...</p>
          </div>
        )}
        
        <div className="max-w-none">
          <div className="flex items-center justify-between mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-3">
              Consultancy Analysis Report
              <CheckCircle2 size={18} className="text-emerald-500" />
            </h3>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
              Ref: {new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div className="text-slate-600 dark:text-slate-300">
            {insight ? (
              <FormattedReport content={insight} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <BrainCircuit size={64} className="text-slate-300 dark:text-slate-700 mb-4" />
                <p className="italic font-medium max-w-sm dark:text-slate-400">Awaiting data synthesis. Click 'Generate Insights' to receive your strategic performance audit.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsView;
