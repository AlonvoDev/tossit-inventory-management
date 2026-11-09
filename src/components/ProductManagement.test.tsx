import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';
import { parseShelfLifeDays, validateProductForm, nextProductCode } from '../features/catalog/productForm';
import { manageableDepartments, normalizeDepartment } from '../app/access';

const api = vi.hoisted(() => ({
  getBusinessProducts: vi.fn(),
  addProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getBusinessFridges: vi.fn(),
  getBusinessCategories: vi.fn(),
  addCustomCategory: vi.fn(),
}));
vi.mock('../api/productsAPI', () => ({
  getBusinessProducts: api.getBusinessProducts,
  addProduct: api.addProduct,
  updateProduct: api.updateProduct,
  deleteProduct: api.deleteProduct,
}));
vi.mock('../api/fridgesAPI', () => ({ getBusinessFridges: api.getBusinessFridges }));
vi.mock('../api/categoriesAPI', () => ({
  getBusinessCategories: api.getBusinessCategories,
  addCustomCategory: api.addCustomCategory,
}));

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));

import ProductManagement from './ProductManagement';

const asRole = (role: 'admin' | 'manager', department: string, isOffline = false) => {
  auth.current = {
    businessId: 'b1',
    role,
    profile: { uid: 'u', fullName: 'x', email: 'x@y.co', role, department, businessId: 'b1' },
    isOffline,
    loading: false,
  };
};

const products: Product[] = [
  { id: 'p1', productId: 'P001', name: 'לימון', shelfLifeDays: 3, type: 'units', area: 'bar', businessId: 'b1' },
  { id: 'p2', productId: 'P002', name: 'עוף', shelfLifeDays: 2, type: 'kg', area: 'kitchen', businessId: 'b1' },
  // legacy Hebrew department value
  { id: 'p3', productId: 'P003', name: 'נענע', shelfLifeDays: 4, type: 'units', area: 'בר' as never, businessId: 'b1' },
];
const fridges: Fridge[] = [
  { id: 'f1', name: 'מקרר בר', department: 'bar', businessId: 'b1' },
  { id: 'f2', name: 'מקרר מטבח', department: 'kitchen', businessId: 'b1' },
];

describe('catalog form rules', () => {
  it('accepts only positive whole days without truncation', () => {
    expect(parseShelfLifeDays('7')).toBe(7);
    for (const bad of ['1.5', '0', '-2', '', 'abc', '1e2', '99999']) {
      expect(parseShelfLifeDays(bad)).toBeNull();
    }
  });

  it('rejects departments outside the manager scope', () => {
    const errors = validateProductForm(
      { name: 'x', shelfLifeDays: '1', type: 'units', area: 'kitchen', category: '', fridgeId: '' },
      ['bar'],
    );
    expect(errors.area).toBe('אין לך הרשאה לנהל את המחלקה הזו');
  });

  it('scopes roles and legacy departments', () => {
    expect(manageableDepartments('admin', 'bar')).toEqual(['bar', 'kitchen']);
    expect(manageableDepartments('manager', 'מטבח')).toEqual(['kitchen']);
    expect(manageableDepartments('manager', undefined)).toEqual([]);
    expect(manageableDepartments('staff', 'bar')).toEqual([]);
    expect(normalizeDepartment('בר')).toBe('bar');
    expect(normalizeDepartment('Bar')).toBeNull();
  });

  it('generates the next display code', () => {
    expect(nextProductCode([])).toBe('P001');
    expect(nextProductCode([{ productId: 'P009' }, { productId: 'product12' }])).toBe('P010');
  });
});

describe('ProductManagement', () => {
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    api.getBusinessProducts.mockResolvedValue(products);
    api.getBusinessFridges.mockResolvedValue(fridges);
    api.getBusinessCategories.mockResolvedValue([]);
  });

  it('bar manager sees only bar products, including legacy Hebrew values', async () => {
    asRole('manager', 'bar');
    render(<ProductManagement />);
    expect(await screen.findByText('לימון')).toBeInTheDocument();
    expect(screen.getByText('נענע')).toBeInTheDocument();
    expect(screen.queryByText('עוף')).not.toBeInTheDocument();
  });

  it('manager form is locked to their department, offers only their fridges and no category creation', async () => {
    asRole('manager', 'kitchen');
    render(<ProductManagement />);
    await screen.findByText('עוף');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף מוצר חדש' }));
    const form = screen.getByRole('form', { name: 'הוספת מוצר' });
    const dept = within(form).getByRole('combobox', { name: /מחלקה/ });
    expect(dept).toBeDisabled();
    expect(dept).toHaveValue('kitchen');
    expect(within(form).getByRole('option', { name: /מקרר מטבח/ })).toBeInTheDocument();
    expect(within(form).queryByRole('option', { name: /מקרר בר/ })).not.toBeInTheDocument();
    expect(within(form).queryByRole('button', { name: 'הוסף קטגוריה חדשה' })).not.toBeInTheDocument();
  });

  it('rejects fractional shelf life instead of truncating it', async () => {
    asRole('admin', 'bar');
    render(<ProductManagement />);
    await screen.findByText('לימון');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף מוצר חדש' }));
    const form = screen.getByRole('form', { name: 'הוספת מוצר' });
    fireEvent.change(within(form).getByPlaceholderText('הזן שם מוצר'), { target: { value: 'חלב' } });
    fireEvent.change(within(form).getByRole('spinbutton'), { target: { value: '1.5' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /מחלקה/ }), { target: { value: 'kitchen' } });
    await userEvent.click(within(form).getByRole('button', { name: 'הוסף מוצר' }));
    expect(within(form).getByText(/יש להזין מספר שלם של ימים/)).toBeInTheDocument();
    expect(api.addProduct).not.toHaveBeenCalled();
  });

  it('adds a valid product with the next code and reloads', async () => {
    asRole('admin', 'bar');
    api.addProduct.mockResolvedValue('new');
    render(<ProductManagement />);
    await screen.findByText('לימון');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף מוצר חדש' }));
    const form = screen.getByRole('form', { name: 'הוספת מוצר' });
    fireEvent.change(within(form).getByPlaceholderText('הזן שם מוצר'), { target: { value: ' חלב ' } });
    fireEvent.change(within(form).getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /מחלקה/ }), { target: { value: 'kitchen' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /סוג מדידה/ }), { target: { value: 'kg' } });
    await userEvent.click(within(form).getByRole('button', { name: 'הוסף מוצר' }));
    await waitFor(() =>
      expect(api.addProduct).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'P004', name: 'חלב', shelfLifeDays: 5, area: 'kitchen', type: 'kg', businessId: 'b1' }),
      ),
    );
    expect(await screen.findByText('המוצר "חלב" נוסף')).toBeInTheDocument();
    expect(api.getBusinessProducts).toHaveBeenCalledTimes(2);
  });

  it('offline: no add, edit or delete and no local queue', async () => {
    asRole('admin', 'bar', true);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<ProductManagement />);
    await screen.findByText('לימון');
    expect(screen.getByRole('button', { name: 'הוסף מוצר חדש' })).toBeDisabled();
    screen.getAllByRole('button', { name: 'ערוך' }).forEach(b => expect(b).toBeDisabled());
    screen.getAllByRole('button', { name: 'מחק' }).forEach(b => expect(b).toBeDisabled());
    expect(setItem).not.toHaveBeenCalledWith('pendingOperations', expect.anything());
    setItem.mockRestore();
  });

  it('shows a permission error, not success, when saving is denied', async () => {
    asRole('admin', 'bar');
    api.updateProduct.mockRejectedValue(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    render(<ProductManagement />);
    await screen.findByText('לימון');
    await userEvent.click(screen.getAllByRole('button', { name: 'ערוך' })[0]);
    const form = screen.getByRole('form', { name: 'עריכת מוצר' });
    expect(within(form).getByRole('combobox', { name: /סוג מדידה/ })).toBeDisabled();
    await userEvent.click(within(form).getByRole('button', { name: 'עדכן מוצר' }));
    expect(await screen.findByText('אין לך הרשאה לבצע פעולה זו.')).toBeInTheDocument();
    expect(screen.queryByText(/עודכן/)).not.toBeInTheDocument();
  });

  it('does not offer a self-service business ID setter', async () => {
    asRole('admin', 'bar');
    auth.current = { ...auth.current, businessId: null };
    render(<ProductManagement />);
    expect(screen.queryByText('הגדרת מזהה עסק')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('הזן מזהה עסק')).not.toBeInTheDocument();
  });
});
