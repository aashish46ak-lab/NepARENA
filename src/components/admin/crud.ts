import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type CrudOpts = {
  order?: { column: string; ascending?: boolean }[];
  invalidate?: string[];
  /** Equality filters applied to list queries (tenant scope) */
  eq?: Record<string, string | number | boolean | null>;
};

export function useCrud<T extends { id: string }>(table: string, opts?: CrudOpts) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const invalidate = () => (opts?.invalidate ?? [table]).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const eqKey = JSON.stringify(opts?.eq ?? {});

  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(table).select("*");
    if (opts?.eq) {
      for (const [col, val] of Object.entries(opts.eq)) {
        if (val === null) q = q.is(col, null);
        else q = q.eq(col, val);
      }
    }
    for (const o of opts?.order ?? [{ column: "created_at", ascending: false }]) {
      q = q.order(o.column, { ascending: o.ascending ?? false });
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as T[]);
    setLoading(false);
  }, [table, eqKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (values: Partial<T>) => {
    const { data, error } = await supabase.from(table).insert(values as never).select().single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.success("Created");
    invalidate();
    await reload();
    return data as T;
  };
  const update = async (id: string, values: Partial<T>) => {
    const { error } = await supabase.from(table).update(values as never).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Saved");
    invalidate();
    await reload();
    return true;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Deleted");
    invalidate();
    await reload();
    return true;
  };
  return { rows, loading, reload, create, update, remove };
}
