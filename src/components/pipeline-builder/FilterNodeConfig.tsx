import { useState } from "react";
import { BuilderNode } from "./types";
import { Filter, Trash2, Plus, Terminal } from "lucide-react";

interface Props {
  node: BuilderNode;
  onUpdate: (id: string, updates: Partial<BuilderNode>) => void;
}

interface Condition {
  id: string;
  column: string;
  operator: string;
  value: string;
}

export default function FilterNodeConfig({ node, onUpdate }: Props) {
  const [conditions, setConditions] = useState<Condition[]>(() => {
    try {
      return node.config.conditions ? JSON.parse(node.config.conditions) : [];
    } catch {
      return [];
    }
  });

  const saveConditions = (newConds: Condition[]) => {
    setConditions(newConds);
    onUpdate(node.id, { config: { ...node.config, conditions: JSON.stringify(newConds) } });
  };

  const addCondition = () => {
    saveConditions([...conditions, { id: Math.random().toString(36).substr(2, 9), column: "", operator: "=", value: "" }]);
  };

  const removeCondition = (id: string) => {
    saveConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    saveConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Filter Conditions</label>
        <button
          onClick={addCondition}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
        {conditions.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border/40 rounded-2xl">
             <p className="text-[10px] text-muted-foreground italic">No filters. All records pass.</p>
          </div>
        ) : (
          conditions.map((cond) => (
            <div key={cond.id} className="p-3 rounded-xl border border-border/50 bg-muted/10 space-y-2 group animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between gap-1">
                <input
                  type="text"
                  value={cond.column}
                  onChange={(e) => updateCondition(cond.id, { column: e.target.value })}
                  placeholder="Column..."
                  className="flex-1 h-7 bg-transparent border-none p-0 text-[10px] font-bold text-foreground focus:ring-0"
                />
                <button 
                  onClick={() => removeCondition(cond.id)}
                  className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-1.5">
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                  className="w-16 h-7 rounded-lg border border-border/50 bg-background text-[10px] text-foreground focus:outline-none"
                >
                  <option value="=">=</option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="LIKE">LIKE</option>
                  <option value="IN">IN</option>
                </select>
                <input
                  type="text"
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  placeholder="Value..."
                  className="flex-1 h-7 px-2 rounded-lg border border-border/50 bg-background text-[10px] text-foreground focus:outline-none"
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
        <p className="text-[9px] text-accent font-medium leading-relaxed">
          Filter logic is applied row-by-row during the extraction stage.
        </p>
      </div>
    </div>
  );
}
