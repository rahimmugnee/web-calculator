import { applyRuntimeProductRows, mapRuntimeProductRows } from "./apply-runtime-product-rows";

test("maps a PA database row to the existing product shape with DB columns authoritative", () => {
  const [product] = mapRuntimeProductRows([{
    product_id: 42,
    source_key: "pa:cmx-ea-60a",
    source_catalog: "admin",
    system_type: "pa-system",
    category_slug: "mixer-amplifier",
    component_type: "mixer-amplifier",
    name: "Database Mixer Amplifier",
    brand_name: "Database Brand",
    model: "DB-60",
    unit: "Set",
    currency: "BDT",
    price_tier: "default",
    unit_price: "17500.50",
    is_active: true,
    technical_metadata: {
      id: "stale-id",
      brand: "Stale Brand",
      model: "STALE",
      productName: "Stale product name",
      unit: "Nos.",
      unitPrice: 1,
      installationType: "wired",
      powerWatts: 60,
      customTechnicalField: "preserved",
    },
  }], { systemType: "pa-system" });

  expect(product).toMatchObject({
    id: "cmx-ea-60a",
    databaseId: 42,
    brand: "Database Brand",
    model: "DB-60",
    name: "Database Mixer Amplifier",
    productName: "Database Mixer Amplifier",
    unit: "Set",
    unitPrice: 17500.5,
    componentType: "mixer-amplifier",
    installationType: "wired",
    powerWatts: 60,
    customTechnicalField: "preserved",
    active: true,
  });
});

test("maps Conference metadata while keeping wired/wireless systemType distinct from the catalog system", () => {
  const [product] = mapRuntimeProductRows([{
    source_key: "conference:spon-lcm-6010",
    system_type: "conference-system",
    component_type: "master-control-unit",
    name: "Live Control Unit",
    brand_name: "Spoon",
    model: "LCM-6010",
    unit: "Nos.",
    unit_price: 99000,
    technical_metadata: { id: "old", systemType: "both", customProtocol: "Dante" },
  }], { systemType: "conference-system" });

  expect(product).toMatchObject({
    id: "spon-lcm-6010",
    catalogSystemType: "conference-system",
    systemType: "both",
    componentType: "master-control-unit",
    productName: "Live Control Unit",
    unitPrice: 99000,
    customProtocol: "Dante",
  });
});

test("uses a custom product source key as its stable runtime id and does not mix systems", () => {
  const products = mapRuntimeProductRows([
    {
      source_key: "admin:uuid:new-speaker",
      system_type: "pa-system",
      component_type: "wall-speaker",
      name: "New Speaker",
      model: "SP-1",
      brand_name: null,
      unit_price: 2500,
      technical_metadata: { id: "copied-id", brand: "Stale Brand", installationType: "both" },
    },
    {
      source_key: "conference:other",
      system_type: "conference-system",
      name: "Other system product",
      unit_price: 1,
      technical_metadata: {},
    },
  ], { systemType: "pa-system" });

  expect(products).toHaveLength(1);
  expect(products[0]).toMatchObject({ id: "admin:uuid:new-speaker", brand: "", model: "SP-1", installationType: "both" });
});

test("deduplicates price-tier rows and gives the default database price priority", () => {
  const products = mapRuntimeProductRows([
    {
      source_key: "pa:amp-1",
      system_type: "pa-system",
      name: "Amplifier",
      price_tier: "diamond",
      unit_price: 200,
      technical_metadata: { componentType: "amplifier" },
    },
    {
      source_key: "pa:amp-1",
      system_type: "pa-system",
      name: "Amplifier",
      price_tier: "default",
      unit_price: 100,
      technical_metadata: { componentType: "amplifier" },
    },
  ], { systemType: "pa-system" });

  expect(products).toHaveLength(1);
  expect(products[0]).toMatchObject({ id: "amp-1", priceTier: "default", unitPrice: 100 });
});

test("authoritative mode removes missing fallback products without mutating the fallback", () => {
  const fallback = [
    { id: "keep", productName: "Static Keep", unitPrice: 10, technicalValue: "fallback" },
    { id: "remove", productName: "Static Remove", unitPrice: 20 },
  ];
  const rows = [{
    source_key: "pa:keep",
    system_type: "pa-system",
    name: "Live Keep",
    unit_price: 30,
    technical_metadata: { technicalValue: "database" },
  }];

  const result = applyRuntimeProductRows(fallback, rows, { systemType: "pa-system", authoritative: true });

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: "keep", productName: "Live Keep", unitPrice: 30, technicalValue: "database" });
  expect(fallback).toEqual([
    { id: "keep", productName: "Static Keep", unitPrice: 10, technicalValue: "fallback" },
    { id: "remove", productName: "Static Remove", unitPrice: 20 },
  ]);
});

test("non-authoritative mode overlays matching rows and retains static-only products", () => {
  const result = applyRuntimeProductRows(
    [
      { id: "keep", productName: "Static Keep", unitPrice: 10, fallbackOnlyField: true },
      { id: "static-only", productName: "Static Only", unitPrice: 20 },
    ],
    [
      { source_key: "conference:keep", system_type: "conference-system", name: "Live Keep", unit_price: 30, technical_metadata: {} },
      { source_key: "conference:new", system_type: "conference-system", name: "Live New", unit_price: 40, technical_metadata: {} },
    ],
    { systemType: "conference-system", authoritative: false }
  );

  expect(result.map((product) => product.id)).toEqual(["keep", "static-only", "new"]);
  expect(result[0]).toMatchObject({ productName: "Live Keep", unitPrice: 30, fallbackOnlyField: true });
});
