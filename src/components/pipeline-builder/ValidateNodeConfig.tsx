import { useState } from "react";
import { BuilderNode } from "./types";
import { ShieldCheck, AlertCircle, Trash2, Plus, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  node: BuilderNode;
  onUpdate: (id: string, updates: Partial<BuilderNode>) => void;
}

interface Rule {
  id: string;
  column: string;
  check: string;
  value?: string;
}

export default function ValidateNodeConfig({ node, onUpdate }: Props) {
  const [rules, setRules] = useState<Rule[]>(() => {
    try {
      return node.config.rules ? JSON.parse(node.config.rules) : [];
    } catch {
      return [];
    }
  });

  const saveRules = (newRules: Rule[]) => {
    setRules(newRules);
    onUpdate(node.id, { config: { ...node.config, rules: JSON.stringify(newRules) } });
  };

  const addRule = () => {
    saveRules([...rules, { id: Math.random().toString(36).substr(2, 9), column: "", check: "not_null" }]);
  };

  const removeRule = (id: string) => {
    saveRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    saveRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quality Assurance Rules</label>
        <button
          onClick={addRule}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
        >
          <Plus className="w-3 h-3" /> Rule
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
        {rules.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border/40 rounded-2xl">
            <p className="text-[10px] text-muted-foreground italic">No validation rules defined.</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="p-3 rounded-xl border border-border/50 bg-muted/10 space-y-2 group animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 flex items-center gap-2">
                   <ShieldCheck className="w-3.5 h-3.5 text-success" />
                   <input
                     type="text"
                     value={rule.column}
                     onChange={(e) => updateRule(rule.id, { column: e.target.value })}
                     placeholder="Column name..."
                     className="bg-transparent border-none p-0 text-[11px] font-bold text-foreground focus:ring-0 w-full"
                   />
                </div>
                <button 
                  onClick={() => removeRule(rule.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={rule.check}
                  onChange={(e) => updateRule(rule.id, { check: e.target.value })}
                  className="flex-1 h-8 rounded-lg border border-border/50 bg-background text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="not_null">Not Null</option>
                  <option value="regex">Matches Regex</option>
                  <option value="min_max">Range Check</option>
                  <option value="data_type">Type Check</option>
                </select>
                {(rule.check === "regex" || rule.check === "min_max") && (
                  <input
                    type="text"
                    value={rule.value || ""}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    placeholder="Constraint..."
                    className="flex-1 h-8 px-2 rounded-lg border border-border/50 bg-background text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Failure Strategy</label>
        <div className="p-3 rounded-xl border border-warning/20 bg-warning/5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-[10px] font-bold text-warning">Action on mismatch</p>
          </div>
          <select
            value={node.config.on_failure || "stop"}
            onChange={(e) => onUpdate(node.id, { config: { ...node.config, on_failure: e.target.value } })}
            className="w-full h-8 px-2 rounded-lg border border-warning/20 bg-background text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-warning/20 transition-all"
          >
            <option value="stop">Halt Execution (Strict)</option>
            <option value="skip">Skip Record & Log</option>
            <option value="error_table">Redirect to Dead-Letter Table</option>
          </select>
        </div>
      </div>
    </div>
  );
}
