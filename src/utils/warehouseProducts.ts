export const warehouseColors = ['کروم', 'طلایی', 'سفید کروم', 'سفید طلا', 'مشکی طلا', 'کروم مات', 'طلا مات'];
export const warehouseProductTypes = ['دوش', 'آفتابه', 'روشویی', 'سینک', 'روشویی پایه بلند'];
export const showerSinkTypes = ['مانلی', 'آیسان', 'رما', 'جینا'];
export const multiUseSinkTypes = ['دایانا تک منظوره', 'دایانا دومنظوره', 'کیان دوین'];
export const showerSinkModel = 'سینک شاوری';
export const multiUseSinkModel = 'سینک تک و دومنظوره';
export const wallSinkModel = 'سینک دیواری';
export const warehouseModelNames = [
  'آرنیا', 'آندیا', 'رهام', 'سورنا', 'فلت', 'راشین', 'هامین', 'دایانا', 'نویان', 'آترابان',
  'کارولین', 'دنیز', 'ارمیس', 'مانیسا', 'آرشام', 'آبتین', 'تیدا', 'بامبو', 'اکونومی',
  'اکونومی تمام برنج', 'بامبو شایلین'
];
const specialModelOptions = [
  ...warehouseModelNames,
  showerSinkModel,
  multiUseSinkModel,
  wallSinkModel
];

export function getWarehouseModelOptions(customModels: string[] = []): string[] {
  return [...specialModelOptions, ...customModels.filter(model => !specialModelOptions.includes(model))];
}

export function getWarehouseItemsForModel(model: string): string[] {
  if (model === showerSinkModel) return showerSinkTypes;
  if (model === multiUseSinkModel) return multiUseSinkTypes;
  if (model === wallSinkModel) return [wallSinkModel];
  return warehouseProductTypes;
}

export interface WarehouseCatalogProduct {
  key: string;
  model: string;
  color: string;
  item: string;
}

export const getWarehouseProductKey = (model: string, color: string, item: string) =>
  JSON.stringify([model, color, item]);

export function getWarehouseCatalogProducts(customModels: string[] = []): WarehouseCatalogProduct[] {
  const models = [...warehouseModelNames, ...customModels.filter(model => !warehouseModelNames.includes(model))];
  return [
    ...models.flatMap(model => warehouseColors.flatMap(color =>
      warehouseProductTypes.map(item => ({ key: getWarehouseProductKey(model, color, item), model, color, item }))
    )),
    ...showerSinkTypes.flatMap(item => warehouseColors.map(color => ({
      key: getWarehouseProductKey(showerSinkModel, color, item), model: showerSinkModel, color, item
    }))),
    ...multiUseSinkTypes.flatMap(item => warehouseColors.map(color => ({
      key: getWarehouseProductKey(multiUseSinkModel, color, item), model: multiUseSinkModel, color, item
    }))),
    ...warehouseColors.map(color => ({
      key: getWarehouseProductKey(wallSinkModel, color, wallSinkModel),
      model: wallSinkModel, color, item: wallSinkModel
    }))
  ];
}

export const warehouseModelOptions = getWarehouseModelOptions();
export const warehouseCatalogProducts = getWarehouseCatalogProducts();