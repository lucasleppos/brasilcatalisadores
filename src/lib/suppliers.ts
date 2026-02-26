export interface Supplier {
  id: string;
  name: string;
  document: string; // CNPJ/CPF
  email: string;
  branch: string; // Filial
  buyer: string; // Comprador
  margin: number; // %
  createdAt: string;
}

const STORAGE_KEY = "catalisador-pro-suppliers";

export function loadSuppliers(): Supplier[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveSuppliers(suppliers: Supplier[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

export function addSupplier(data: Omit<Supplier, "id" | "createdAt">): Supplier {
  const suppliers = loadSuppliers();
  const supplier: Supplier = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  suppliers.unshift(supplier);
  saveSuppliers(suppliers);
  return supplier;
}

export function updateSupplier(id: string, data: Partial<Omit<Supplier, "id" | "createdAt">>): Supplier | null {
  const suppliers = loadSuppliers();
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  suppliers[idx] = { ...suppliers[idx], ...data };
  saveSuppliers(suppliers);
  return suppliers[idx];
}

export function deleteSupplier(id: string) {
  const suppliers = loadSuppliers().filter((s) => s.id !== id);
  saveSuppliers(suppliers);
}

export function importSuppliers(rows: Omit<Supplier, "id" | "createdAt">[]): number {
  const suppliers = loadSuppliers();
  const newSuppliers = rows.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
  suppliers.unshift(...newSuppliers);
  saveSuppliers(suppliers);
  return newSuppliers.length;
}
