import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { componentModelAndPrice } from "../data/component-model-and-price.js";

const CatalogContext = createContext(null);
const SELECTED_COMPANY_KEY = "calculatorSelectedCompanyId";

export function CatalogProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState(() => window.localStorage.getItem(SELECTED_COMPANY_KEY) || "");
  const [catalog, setCatalog] = useState(componentModelAndPrice);
  const catalogRequestId = useRef(0);
  const loadCompany = useCallback(() => {
    const requestId = ++catalogRequestId.current;
    const apiBase = process.env.REACT_APP_ADMIN_API_URL || "/api";
    return fetch(`${apiBase}/public/companies`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Company list unavailable")))
      .then((companyRows) => {
        setCompanies(companyRows);
        return companyRows.find((item) => String(item.id) === String(selectedCompanyId))
          || companyRows.find((item) => item.is_default)
          || companyRows[0];
      })
      .then((profile) => {
      if (!profile) throw new Error("Company branding unavailable");
      const apiOrigin = new URL(apiBase, window.location.origin).origin;
      const assets = Object.fromEntries(Object.entries(profile.assets || {}).map(([key, path]) => [key, `${apiOrigin}${path}?v=${Date.now()}`]));
      if (requestId !== catalogRequestId.current) return undefined;
      setCompany({ ...profile, assets });
      const favicon = document.querySelector("link[rel='icon']");
      if (favicon && assets.site_logo) favicon.href = assets.site_logo;
      return Promise.all([
        fetch(`${apiBase}/public/company/${profile.id}/led-prices`, { cache: "no-store" }).then((response)=>response.ok?response.json():[]),
        fetch(`${apiBase}/public/catalog/led-module/brands`, { cache: "no-store" }).then((response)=>response.ok?response.json():[]),
      ]).then(([rows,brandRows])=>{
        if (requestId !== catalogRequestId.current) return;
        const moduleBrandPrices={...componentModelAndPrice.moduleBrandPrices};
        const controllers=(componentModelAndPrice.controllers||[]).map((item)=>({...item}));
        const novastarControllers=(componentModelAndPrice.novastarControllers||[]).map((item)=>({...item}));
        const receivingCards=Object.fromEntries(Object.entries(componentModelAndPrice.receivingCards||{}).map(([id,item])=>[id,{...item}]));
        const cabinetOptions=(componentModelAndPrice.cabinetOptions||[]).map((item)=>({...item}));
        let powerSupplyPrice=componentModelAndPrice.powerSupplyPrice;
        const powerSupplyPrices=Object.fromEntries((componentModelAndPrice.powerSupplyBrands||[]).map((brand)=>[typeof brand==="string"?brand:brand.value,componentModelAndPrice.powerSupplyPrice]));
        rows.forEach((row)=>{
          const id=row.technical_metadata?.id||row.source_key?.split(":").pop();
          const price=Number(row.unit_price);
          if(!Number.isFinite(price))return;
          if(row.component_type==="module"){
            const brand=row.brand_name;
            if(!id||!brand||!row.price_tier)return;
            moduleBrandPrices[brand]={...(moduleBrandPrices[brand]||{}),[id]:{...(moduleBrandPrices[brand]?.[id]||{}),[row.price_tier]:price}};
          }else if(row.component_type==="controller"&&(row.price_tier==="default"||row.price_tier==="gold")){
            const controller=[...controllers,...novastarControllers].find((item)=>String(item.id)===String(id)||String(item.id)===String(row.model));
            if(controller)controller.price=price;
          }else if(row.component_type==="receiving-card"){
            const card=receivingCards[id]||receivingCards[row.model];
            if(card){if(row.price_tier==="cob")card.cobUnitPrice=price;else if(row.price_tier==="default"||row.price_tier==="gold")card.unitPrice=price;}
          }else if(row.component_type==="cabinet"&&(row.price_tier==="default"||row.price_tier==="gold")){
            const cabinet=cabinetOptions.find((item)=>String(item.id)===String(id)||String(item.id)===String(row.model));
            if(cabinet)cabinet.price=price;
          }else if(row.component_type==="power-supply"&&(row.price_tier==="default"||row.price_tier==="gold")){
            if(row.brand_name)powerSupplyPrices[row.brand_name]=price;
            if(!row.brand_name||row.brand_name===(componentModelAndPrice.powerSupplyBrands||[])[0])powerSupplyPrice=price;
          }
        });
        const grouped=new Map();
        brandRows.forEach((row)=>{if(!grouped.has(row.id))grouped.set(row.id,{value:row.name,label:row.name,modelIds:[]});const modelId=row.technical_metadata?.id||row.source_key?.split(":").pop();if(modelId)grouped.get(row.id).modelIds.push(modelId);});
        const databaseBrands=[...grouped.values()];
        const moduleBrands=databaseBrands.length?databaseBrands.map(({value,label})=>({value,label})):componentModelAndPrice.moduleBrands;
        const moduleBrandModelIds=databaseBrands.length?Object.fromEntries(databaseBrands.map((brand)=>[brand.value,[...new Set(brand.modelIds)]])):undefined;
        setCatalog({...componentModelAndPrice,moduleBrandPrices,moduleBrands,moduleBrandModelIds,controllers,novastarControllers,receivingCards,cabinetOptions,powerSupplyPrice,powerSupplyPrices});
      });
    }).catch(() => {
      if (requestId === catalogRequestId.current) setCompany(null);
    });
  }, [selectedCompanyId]);
  useEffect(() => { loadCompany(); }, [loadCompany]);
  useEffect(() => {
    const refresh = () => loadCompany();
    let channel;
    try { channel = new BroadcastChannel("calculator-live-updates"); channel.addEventListener("message", refresh); } catch {}
    const storageRefresh = (event) => { if (event.key === "calculatorLiveUpdate") refresh(); };
    window.addEventListener("storage", storageRefresh);
    window.addEventListener("calculator-admin-change", refresh);
    window.addEventListener("focus", refresh);
    return () => { channel?.close(); window.removeEventListener("storage", storageRefresh); window.removeEventListener("calculator-admin-change", refresh); window.removeEventListener("focus", refresh); };
  }, [loadCompany]);
  const setSelectedCompanyId = useCallback((companyId) => {
    const value = String(companyId || "");
    setSelectedCompanyIdState(value);
    window.localStorage.setItem(SELECTED_COMPANY_KEY, value);
  }, []);
  const value = useMemo(() => ({ catalog, company, companies, selectedCompanyId: String(company?.id || selectedCompanyId), setSelectedCompanyId }), [catalog,company,companies,selectedCompanyId,setSelectedCompanyId]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
