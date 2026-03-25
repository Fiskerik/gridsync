import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CategoryAssignment {
  product_id: string;
  category_id: string;
}

const PRESET_COLORS = [
  "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<CategoryAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("product_categories")
      .select("*")
      .order("name");
    if (!error && data) setCategories(data as Category[]);
  }, []);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("product_category_assignments")
      .select("product_id, category_id");
    if (!error && data) setAssignments(data as CategoryAssignment[]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchAssignments()]);
    setLoading(false);
  }, [fetchCategories, fetchAssignments]);

  useEffect(() => { refresh(); }, [refresh]);

  const createCategory = useCallback(async (name: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const finalColor = color || PRESET_COLORS[categories.length % PRESET_COLORS.length];
    const { data, error } = await (supabase as any)
      .from("product_categories")
      .insert({ user_id: user.id, name: name.trim(), color: finalColor })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") toast.error("Category already exists");
      else toast.error("Failed to create category");
      return null;
    }
    const cat = data as Category;
    setCategories((prev) => [...prev, cat]);
    return cat;
  }, [categories.length]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    const { error } = await (supabase as any)
      .from("product_categories")
      .delete()
      .eq("id", categoryId);
    if (error) { toast.error("Failed to delete category"); return; }
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setAssignments((prev) => prev.filter((a) => a.category_id !== categoryId));
    toast.success("Category deleted");
  }, []);

  const assignCategory = useCallback(async (productId: string, categoryId: string) => {
    const { error } = await (supabase as any)
      .from("product_category_assignments")
      .insert({ product_id: productId, category_id: categoryId });
    if (error && error.code !== "23505") { toast.error("Failed to assign category"); return; }
    setAssignments((prev) => [
      ...prev.filter((a) => !(a.product_id === productId && a.category_id === categoryId)),
      { product_id: productId, category_id: categoryId },
    ]);
  }, []);

  const unassignCategory = useCallback(async (productId: string, categoryId: string) => {
    const { error } = await (supabase as any)
      .from("product_category_assignments")
      .delete()
      .eq("product_id", productId)
      .eq("category_id", categoryId);
    if (error) { toast.error("Failed to remove category"); return; }
    setAssignments((prev) => prev.filter((a) => !(a.product_id === productId && a.category_id === categoryId)));
  }, []);

  const assignCategoryToMany = useCallback(async (productIds: string[], categoryId: string) => {
    const rows = productIds.map((pid) => ({ product_id: pid, category_id: categoryId }));
    const { error } = await (supabase as any)
      .from("product_category_assignments")
      .upsert(rows, { onConflict: "product_id,category_id" });
    if (error) { toast.error("Failed to assign categories"); return; }
    await fetchAssignments();
    toast.success(`Category assigned to ${productIds.length} products`);
  }, [fetchAssignments]);

  const unassignCategoryFromMany = useCallback(async (productIds: string[], categoryId: string) => {
    for (const pid of productIds) {
      await (supabase as any)
        .from("product_category_assignments")
        .delete()
        .eq("product_id", pid)
        .eq("category_id", categoryId);
    }
    await fetchAssignments();
    toast.success(`Category removed from ${productIds.length} products`);
  }, [fetchAssignments]);

  const getProductCategories = useCallback((productId: string): Category[] => {
    const catIds = assignments.filter((a) => a.product_id === productId).map((a) => a.category_id);
    return categories.filter((c) => catIds.includes(c.id));
  }, [assignments, categories]);

  const getProductsByCategory = useCallback((categoryId: string): string[] => {
    return assignments.filter((a) => a.category_id === categoryId).map((a) => a.product_id);
  }, [assignments]);

  return {
    categories,
    assignments,
    loading,
    refresh,
    createCategory,
    deleteCategory,
    assignCategory,
    unassignCategory,
    assignCategoryToMany,
    unassignCategoryFromMany,
    getProductCategories,
    getProductsByCategory,
    PRESET_COLORS,
  };
}
