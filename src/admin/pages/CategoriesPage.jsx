import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { get, post, put, remove } from "../api";
import { EmptyState, Notice, StatusBadge } from "../AdminLayout";
import { useCompany } from "../contexts";
import { componentModelAndPrice } from "../../data/component-model-and-price";
import "./CategoriesPage.css";
import "./CategoriesPageFixes.css";

const systemLabels={"led-display":"LED Display","rental-led":"Rental LED Display","pa-system":"PA System","conference-system":"Conference System"};
const systemOrder=["led-display","conference-system","pa-system","rental-led"];
const PAGE_SIZE=8;

export default function CategoriesPage(){
  const {companyId}=useCompany();
  const [categories,setCategories]=useState([]),[brands,setBrands]=useState([]),[products,setProducts]=useState([]),[selectedId,setSelectedId]=useState(null);
  const [expanded,setExpanded]=useState(()=>new Set()),[expandedComponents,setExpandedComponents]=useState(()=>new Set()),[treeSearch,setTreeSearch]=useState(""),[brandSearch,setBrandSearch]=useState(""),[modelSearch,setModelSearch]=useState("");
  const [brandFilter,setBrandFilter]=useState(""),[technologyFilter,setTechnologyFilter]=useState(""),[statusFilter,setStatusFilter]=useState(""),[locationFilter,setLocationFilter]=useState("indoor"),[page,setPage]=useState(1),[tab,setTab]=useState("models");
  const [modal,setModal]=useState(null),[notice,setNotice]=useState(""),[error,setError]=useState("");
  const importRef=useRef(null);

  const loadCatalog=useCallback(async()=>{
    const [categoryRows,brandRows]=await Promise.all([get("/admin/categories"),get("/admin/brands?limit=100")]);
    setCategories(categoryRows);setBrands(brandRows);
    setSelectedId((current)=>{
	      const defaultLedCategory=categoryRows.find((item)=>item.system_type==="led-display"&&item.slug==="led-module")||categoryRows.find((item)=>item.system_type==="led-display"&&item.parent_id);
	      const next=categoryRows.some((item)=>item.id===current)?current:(defaultLedCategory?.id||categoryRows[0]?.id||null);
      const selected=categoryRows.find((item)=>item.id===next);
      if(selected?.parent_id)setExpanded((value)=>new Set(value).add(selected.parent_id));
      return next;
    });
  },[]);
  const loadProducts=useCallback(async(categoryId)=>{
    if(!categoryId){setProducts([]);return;}
    setProducts(await get(`/admin/products?categoryId=${categoryId}&companyId=${companyId}&limit=100`));
  },[companyId]);
  useEffect(()=>{loadCatalog().catch((e)=>setError(e.message));},[loadCatalog]);
  useEffect(()=>{loadProducts(selectedId).catch((e)=>setError(e.message));},[selectedId,loadProducts]);

  const selected=categories.find((item)=>item.id===selectedId);
  const parent=categories.find((item)=>item.id===selected?.parent_id);
  const roots=useMemo(()=>categories.filter((item)=>!item.parent_id).sort((a,b)=>systemOrder.indexOf(a.system_type)-systemOrder.indexOf(b.system_type)),[categories]);
  const assignedBrands=useMemo(()=>brands.filter((brand)=>brand.categories?.some((category)=>String(category.id)===String(selectedId))),[brands,selectedId]);
  const visibleBrands=assignedBrands.filter((brand)=>brand.name.toLowerCase().includes(brandSearch.toLowerCase()));
  const brandCounts=useMemo(()=>Object.fromEntries(assignedBrands.map((brand)=>[brand.id,products.filter((product)=>String(product.brand_id)===String(brand.id)).length])),[assignedBrands,products]);
  const filteredProducts=useMemo(()=>products.filter((product)=>{
    const query=modelSearch.trim().toLowerCase();
    const matchesLocation=selected?.slug!=="led-module"||String(product.technical_metadata?.location||"indoor").toLowerCase()===locationFilter;
    const matchesTechnology=selected?.slug!=="led-module"||!technologyFilter||String(product.technical_metadata?.technology||"").toLowerCase()===technologyFilter;
    return matchesLocation&&matchesTechnology&&(!brandFilter||String(product.brand_id)===String(brandFilter))&&(!statusFilter||String(product.is_active)===statusFilter)&&(!query||[cleanModelName(product.model),product.name,product.sku].some((value)=>String(value||"").toLowerCase().includes(query)));
  }),[products,brandFilter,technologyFilter,statusFilter,modelSearch,locationFilter,selected?.slug]);
  const pages=Math.max(1,Math.ceil(filteredProducts.length/PAGE_SIZE));
  const pagedProducts=filteredProducts.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  useEffect(()=>setPage(1),[selectedId,brandFilter,technologyFilter,statusFilter,modelSearch,locationFilter]);
  useEffect(()=>{if(selected?.uses_brand===false){setTab("models");setBrandFilter("");}},[selected?.id,selected?.uses_brand]);

  const refresh=async(message)=>{await Promise.all([loadCatalog(),loadProducts(selectedId)]);if(message)setNotice(message);};
  const toggleRoot=(rootId)=>setExpanded((current)=>{const next=new Set(current);next.has(rootId)?next.delete(rootId):next.add(rootId);return next;});
  const selectComponent=(componentId)=>{setSelectedId(componentId);setBrandFilter("");setExpandedComponents((current)=>{const next=new Set(current);next.has(componentId)?next.delete(componentId):next.add(componentId);return next;});};
  const selectBrand=(brandId)=>{setBrandFilter((current)=>String(current)===String(brandId)?"":String(brandId));setTab("models");};

  const saveBrand=async(event)=>{
    event.preventDefault();setError("");const form=new FormData(event.currentTarget);
    try{
      const existingId=Number(form.get("existing_brand_id")||0);
      if(existingId){const brand=brands.find((item)=>item.id===existingId);await put(`/admin/brands/${brand.id}`,{name:brand.name,slug:brand.slug,is_active:brand.is_active,category_ids:[...new Set([...(brand.categories||[]).map((item)=>item.id),selected.id])]});}
      else{const name=String(form.get("name")||"").trim();await post("/admin/brands",{name,slug:slugify(name),is_active:true,category_ids:[selected.id]});}
      setModal(null);await refresh("Brand added successfully.");
    }catch(e){setError(e.message);}
  };
  const unassignBrand=async(brand)=>{
    if(!window.confirm(`Remove ${brand.name} from ${selected.name}? Shared brand records and existing models will not be deleted.`))return;
    try{await put(`/admin/brands/${brand.id}`,{name:brand.name,slug:brand.slug,is_active:brand.is_active,category_ids:(brand.categories||[]).filter((item)=>item.id!==selected.id).map((item)=>item.id)});if(String(brandFilter)===String(brand.id))setBrandFilter("");await refresh(`${brand.name} removed from ${selected.name}.`);}catch(e){setError(e.message);}
  };
  const deleteSelectedBrand=async()=>{
    const brand=assignedBrands.find((item)=>String(item.id)===String(brandFilter));
    if(!brand||!window.confirm(`Delete ${brand.name}? This brand will be permanently removed.`))return;
    try{await remove(`/admin/brands/${brand.id}`);setBrandFilter("");await refresh(`${brand.name} deleted successfully.`);}catch(e){setError(e.message);}
  };
  const saveProduct=async(event)=>{
    event.preventDefault();setError("");const form=new FormData(event.currentTarget),editing=modal.product;
    try{
      const moduleCategory=selected.slug==="led-module";
      const metadata={...(editing?.technical_metadata||{}),...(moduleCategory?{technology:String(form.get("technology")||"").toLowerCase()}:{})};
      const body={name:form.get("name"),model:cleanModelName(form.get("model")),sku:editing?.sku||"",unit:editing?.unit||(moduleCategory?"Module":"Nos."),category_id:selected.id,brand_id:selected.uses_brand?Number(form.get("brand_id")):null,is_active:editing?.is_active!==false,technical_metadata:metadata};
      const saved=editing?.id?await put(`/admin/products/${editing.id}`,body):await post("/admin/products",body);
      const price=Number(form.get("price")??form.get("price_gold")),tier=priceTierForCategory(selected);
      if(Number.isFinite(price)&&price>=0)await put(`/admin/prices/${saved.id}`,{company_id:Number(companyId),prices:{[tier]:price}});
      setModal(null);await refresh(editing?"Model updated.":"Model added.");
    }catch(e){setError(e.message);}
  };
  const saveCategory=async(event)=>{
    event.preventDefault();setError("");const form=new FormData(event.currentTarget),editing=modal.category,isRental=editing.system_type==="rental-led";
    try{await put(`/admin/categories/${editing.id}`,{...editing,name:form.get("name"),slug:form.get("slug"),sort_order:Number(form.get("sort_order")),uses_brand:isRental?false:form.get("uses_brand")==="on",is_active:form.get("active")==="on",specifications_schema:editing.specifications_schema||{},settings:editing.settings||{}});setModal(null);await refresh("Category updated.");}catch(e){setError(e.message);}
  };
  const toggleCategory=async()=>{
    if(!window.confirm(`${selected.is_active?"Deactivate":"Activate"} ${selected.name}?`))return;
    try{await put(`/admin/categories/${selected.id}`,{...selected,is_active:!selected.is_active,specifications_schema:selected.specifications_schema||{},settings:selected.settings||{}});await refresh(`Category ${selected.is_active?"deactivated":"activated"}.`);}catch(e){setError(e.message);}
  };
  const exportModels=()=>{const blob=new Blob([JSON.stringify(products,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`${selected.slug}-models.json`;link.click();URL.revokeObjectURL(url);};
  const importModels=async(event)=>{
    const file=event.target.files?.[0];if(!file)return;
    try{const rows=JSON.parse(await file.text());if(!Array.isArray(rows))throw new Error("Import file must contain a JSON array.");for(const row of rows)await post("/admin/products",{...row,category_id:selected.id,brand_id:selected.uses_brand?row.brand_id:null});await refresh(`${rows.length} models imported.`);}catch(e){setError(e.message);}finally{event.target.value="";}
  };

  const treeQuery=treeSearch.trim().toLowerCase();
  const visibleRoots=roots.filter((root)=>!treeQuery||(systemLabels[root.system_type]||root.name).toLowerCase().includes(treeQuery)||categories.some((item)=>item.parent_id===root.id&&item.name.toLowerCase().includes(treeQuery)));
  const tabs=["models"];
  const canManage=Boolean(selected?.parent_id);

  return <div className="catalog-manager">
    <header className="catalog-page-heading compact"><nav aria-label="Breadcrumb">Home <span>›</span> Catalog <span>›</span> Categories{parent?<><span>›</span>{systemLabels[selected.system_type]}<span>›</span><b>{selected.name}</b></>:null}</nav></header>
    {notice?<Notice message={notice} onClose={()=>setNotice("")}/>:null}{error?<Notice message={error} type="error" onClose={()=>setError("")}/>:null}
    <div className="catalog-grid">
      <aside className="catalog-tree admin-panel"><h2>Category Tree</h2><label className="catalog-search"><span>⌕</span><input value={treeSearch} onChange={(e)=>setTreeSearch(e.target.value)} placeholder="Search category..." aria-label="Search category"/></label>
        <div className="catalog-tree-list">{visibleRoots.map((root)=>{const open=expanded.has(root.id)||Boolean(treeQuery),children=categories.filter((item)=>item.parent_id===root.id&&(!treeQuery||item.name.toLowerCase().includes(treeQuery)));return <div className="catalog-tree-group" key={root.id}>
          <button type="button" className={selectedId===root.id?"selected":""} onClick={()=>{toggleRoot(root.id);setSelectedId(root.id);}} aria-expanded={open}><span>{open?"⌄":"›"}</span><i>{systemIcon(root.system_type)}</i><b>{systemLabels[root.system_type]||root.name}</b></button>
	          {open?<div className="catalog-tree-children">{children.map((child)=>{const componentBrands=brands.filter((brand)=>brand.categories?.some((category)=>String(category.id)===String(child.id))),componentOpen=expandedComponents.has(child.id);return <div className="catalog-tree-component" key={child.id}><button type="button" className={String(selectedId)===String(child.id)&&!brandFilter?"selected":""} onClick={()=>selectComponent(child.id)} aria-expanded={componentBrands.length?componentOpen:undefined}><span className="tree-dot"/><span>{child.name}</span>{componentBrands.length?<b className="component-chevron">{componentOpen?"⌄":"›"}</b>:String(selectedId)===String(child.id)?<em/>:null}</button>{componentOpen&&componentBrands.length?<div className="catalog-tree-brands">{componentBrands.map((brand)=><button type="button" key={brand.id} className={String(selectedId)===String(child.id)&&String(brandFilter)===String(brand.id)?"selected":""} onClick={()=>{setSelectedId(child.id);setBrandFilter(String(brand.id));setTab("models");}}><span className="brand-branch">└</span><span>{brand.name}</span></button>)}</div>:null}</div>;})}</div>:null}
        </div>;})}</div>
      </aside>

      <main className="catalog-center">
        {!selected?<section className="admin-panel"><EmptyState title="Select a category"/></section>:<>
	          <section className="category-summary admin-panel"><div className="category-summary-icon">{categoryIcon(selected.system_type)}</div><div className="category-summary-copy"><div><h2>{selected.name}{brandFilter?` / ${assignedBrands.find((brand)=>String(brand.id)===String(brandFilter))?.name||""}`:""}</h2><StatusBadge active={selected.is_active}/></div><p><b>{systemLabels[selected.system_type]}</b><span>•</span>{selected.brand_count||0} Brands<span>•</span>{selected.model_count||0} Models</p><small>{canManage?"Manage brands and models under this component.":"Select a component from the category tree to manage its catalog."}</small></div><div className="category-summary-actions"><button className="admin-button secondary" type="button" onClick={()=>setModal({type:"category",category:selected})}>✎ Edit Category</button><button className="admin-icon-button" type="button" aria-label="More category actions">•••</button></div></section>
          <section className="catalog-main-card admin-panel">
	            <div className="catalog-tabs">{tabs.map((item)=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)} type="button">{item==="models"?`Models (${products.length})`:titleCase(item)}</button>)}{selected.uses_brand?<label className="catalog-brand-filter" aria-label="Filter by brand"><select value={brandFilter} onChange={(event)=>{setBrandFilter(event.target.value);setTab("models");}}><option value="">All Brands</option>{assignedBrands.map((brand)=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>:null}{selected.slug==="led-module"?<label className="catalog-brand-filter catalog-technology-filter" aria-label="Filter by technology"><select value={technologyFilter} onChange={(event)=>{setTechnologyFilter(event.target.value);setTab("models");}}><option value="">All Technologies</option><option value="smd">SMD</option><option value="gob">GOB</option><option value="cob">COB</option></select></label>:null}<span className="catalog-tabs-spacer"/>{brandFilter?<button className="catalog-delete-brand" type="button" onClick={deleteSelectedBrand}>Delete Brand</button>:null}</div>
            {tab==="specifications"||tab==="settings"?<JsonPanel value={tab==="settings"?selected.settings:selected.specifications_schema} label={tab}/>:null}
            {selected.uses_brand&&tab==="brands"&&canManage?<section className="brands-section"><div className="catalog-section-tools quick-action-toolbar"><button className="admin-button primary" type="button" onClick={()=>setModal({type:"brand"})}>＋ Add Brand</button><button className="admin-button secondary" type="button" onClick={()=>setModal({type:"product",product:null})}>＋ Add Model</button><button className="admin-button secondary" type="button" onClick={()=>importRef.current?.click()}>⇩ Import Models</button><input ref={importRef} type="file" accept="application/json" hidden onChange={importModels}/><button className="admin-button secondary" type="button" onClick={exportModels}>⇧ Export Models</button><button className="admin-button toolbar-danger" type="button" onClick={toggleCategory}>◇ {selected.is_active?"Deactivate":"Activate"}</button><div className="tool-spacer"/><label className="compact-search">⌕<input value={brandSearch} onChange={(e)=>setBrandSearch(e.target.value)} placeholder="Search brand..." aria-label="Search brand"/></label><button className="view-toggle active" aria-label="Grid view">▦</button><button className="view-toggle" aria-label="List view">☷</button></div>
              {visibleBrands.length?<div className="catalog-brand-grid"><button type="button" className={brandFilter===""?"catalog-brand-card selected":"catalog-brand-card"} onClick={()=>{setBrandFilter("");setTab("models");}}><strong>All Brands</strong><StatusBadge/><span>{products.length} Models</span></button>{visibleBrands.map((brand)=><article role="button" tabIndex="0" onClick={()=>selectBrand(brand.id)} onKeyDown={(e)=>e.key==="Enter"&&selectBrand(brand.id)} className={String(brandFilter)===String(brand.id)?"catalog-brand-card selected":"catalog-brand-card"} key={brand.id}><button className="brand-menu" type="button" aria-label={`Remove ${brand.name}`} onClick={(e)=>{e.stopPropagation();unassignBrand(brand);}}>×</button><strong>{brand.name}</strong><StatusBadge active={brand.is_active}/><span>{brandCounts[brand.id]||0} Models</span></article>)}</div>:null}
            </section>:null}
            {canManage&&tab!=="specifications"&&tab!=="settings"?<ModelsSection selected={selected} brands={assignedBrands} products={pagedProducts} total={filteredProducts.length} allCount={products.length} brandFilter={brandFilter} setBrandFilter={setBrandFilter} modelSearch={modelSearch} setModelSearch={setModelSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} page={page} pages={pages} setPage={setPage} onAddBrand={()=>setModal({type:"brand"})} onAdd={()=>setModal({type:"product",product:null})} onEdit={(product)=>setModal({type:"product",product})}/>:null}
          </section>
        </>}
      </main>

    </div>
    {modal?.type==="brand"?<BrandModal category={selected} onClose={()=>setModal(null)} onSave={saveBrand}/>:null}
    {modal?.type==="product"?<ProductModal category={selected} brands={assignedBrands} product={modal.product} onClose={()=>setModal(null)} onSave={saveProduct}/>:null}
    {modal?.type==="category"?<CategoryModal category={modal.category} onClose={()=>setModal(null)} onSave={saveCategory}/>:null}
  </div>;
}

function ModelsSection({selected,products,total,allCount,modelSearch,setModelSearch,statusFilter,setStatusFilter,locationFilter,setLocationFilter,page,pages,setPage,onAddBrand,onAdd,onEdit}){
  const ledModules=selected.slug==="led-module";
  return <section className="models-section">{ledModules?<div className="model-location-tabs"><div className="model-location-options"><button type="button" className={locationFilter==="indoor"?"active":""} onClick={()=>setLocationFilter("indoor")}>Indoor Models</button><button type="button" className={locationFilter==="outdoor"?"active":""} onClick={()=>setLocationFilter("outdoor")}>Outdoor Models</button></div><div className="model-top-actions"><label className="compact-search">⌕<input value={modelSearch} onChange={(e)=>setModelSearch(e.target.value)} placeholder="Search model..." aria-label="Search model"/></label><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} aria-label="Status filter"><option value="">All Statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>{selected.uses_brand?<button className="admin-button secondary" type="button" onClick={onAddBrand}>＋ Add Brand</button>:null}<button className="admin-button primary" type="button" onClick={onAdd}>＋ Add Model</button></div></div>:<div className="models-heading"><h3>Models ({total})</h3><div><label className="compact-search">⌕<input value={modelSearch} onChange={(e)=>setModelSearch(e.target.value)} placeholder="Search model..." aria-label="Search model"/></label><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} aria-label="Status filter"><option value="">All Statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>{selected.uses_brand?<button className="admin-button secondary" type="button" onClick={onAddBrand}>＋ Add Brand</button>:null}<button className="admin-button primary" type="button" onClick={onAdd}>＋ Add Model</button></div></div>}
    {products.length?<div className="admin-table-wrap"><table className="admin-table catalog-model-table"><thead><tr><th>SL No</th><th>Label</th><th>Model</th><th>Brand</th><th>Technology</th><th>Price</th><th aria-label="Actions"/></tr></thead><tbody>{products.map((product,index)=>{const price=calculatorModulePrice(product);return <tr key={product.id}><td>{(page-1)*PAGE_SIZE+index+1}</td><td>{product.name||"—"}</td><td><b>{cleanModelName(product.model||product.name)}</b></td><td>{product.brand_name||"—"}</td><td>{String(product.technical_metadata?.technology||"—").toUpperCase()}</td><td>{price!==null?`৳ ${price.toLocaleString()}`:"—"}</td><td><button className="row-action" type="button" onClick={()=>onEdit(product)} aria-label={`Edit ${cleanModelName(product.model||product.name)}`}>✎</button></td></tr>;})}</tbody></table></div>:<EmptyState title="No models match these filters" description="Add a model or change the current filters."/>}
    <footer className="models-footer"><span>Showing {total?((page-1)*PAGE_SIZE)+1:0} to {Math.min(page*PAGE_SIZE,total)} of {total} models{total!==allCount?" (filtered)":""}</span><div><button disabled={page===1} onClick={()=>setPage(page-1)}>‹</button>{Array.from({length:pages},(_,index)=>index+1).slice(Math.max(0,page-3),Math.max(5,page+2)).map((number)=><button key={number} className={page===number?"active":""} onClick={()=>setPage(number)}>{number}</button>)}<button disabled={page===pages} onClick={()=>setPage(page+1)}>›</button></div></footer>
  </section>;
}

function BrandModal({category,onClose,onSave}){return <Modal title="Add Brand" subtitle={`Add a new brand to ${category.name}.`} onClose={onClose}><form onSubmit={onSave}><label>Brand Name<input name="name" required maxLength="255" autoFocus placeholder="Enter brand name"/></label><ModalActions onClose={onClose} label="Add Brand"/></form></Modal>;}
function ProductModal({category,brands,product,onClose,onSave}){const metadata=product?.technical_metadata||{};return <Modal title={product?.id?"Edit Model":"Add Model"} subtitle={`${systemLabels[category.system_type]} · ${category.name}`} onClose={onClose} wide><form onSubmit={onSave}><div className="admin-form-grid"><label>Label<input name="name" required defaultValue={product?.name||""}/></label><label>Model<input name="model" required defaultValue={cleanModelName(product?.model||"")} placeholder="Example: P1.53"/></label>{category.uses_brand?<label>Brand<select name="brand_id" required defaultValue={product?.brand_id||""}><option value="">Select brand</option>{brands.map((brand)=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>:null}<label>Technology<select name="technology" required defaultValue={String(metadata.technology||"smd").toLowerCase()}><option value="smd">SMD</option><option value="gob">GOB</option><option value="cob">COB</option></select></label><label>Gold Price<input name="price_gold" type="number" min="0" step="0.01" required defaultValue={calculatorTierPrice(product,"gold")??""}/></label></div><ModalActions onClose={onClose} label={product?.id?"Save Changes":"Add Model"}/></form></Modal>;}
function CategoryModal({category,onClose,onSave}){const rental=category.system_type==="rental-led";return <Modal title="Edit Category" subtitle={systemLabels[category.system_type]} onClose={onClose}><form onSubmit={onSave}><label>Category Name<input name="name" required defaultValue={category.name}/></label><label>Slug / Code<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={category.slug}/></label><label>Sort Order<input name="sort_order" type="number" defaultValue={category.sort_order||0}/></label><label className="admin-check"><input name="uses_brand" type="checkbox" defaultChecked={category.uses_brand} disabled={rental}/>Uses brands {rental?<small>(disabled for Rental LED)</small>:null}</label><label className="admin-check"><input name="active" type="checkbox" defaultChecked={category.is_active}/>Active</label><ModalActions onClose={onClose} label="Save Category"/></form></Modal>;}
function Modal({title,subtitle,onClose,wide,children}){return <div className="admin-modal-backdrop"><div className={wide?"admin-modal wide":"admin-modal"} role="dialog" aria-modal="true"><div className="admin-modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>;}
function ModalActions({onClose,label}){return <div className="admin-modal-actions"><button className="admin-button secondary" type="button" onClick={onClose}>Cancel</button><button className="admin-button primary" type="submit">{label}</button></div>;}
function JsonPanel({value,label}){return <div className="admin-json-panel"><p>Structured {label} are preserved as JSONB for category-specific calculator data.</p><pre>{JSON.stringify(value||{},null,2)}</pre></div>;}
function cleanModelName(value){return String(value||"").replace(/\s+(?:COB|GOB|SMD)\b/gi,"").trim();}
function priceTierForCategory(category){return category?.slug==="led-module"?"gold":"default";}
function calculatorModulePrice(product){return calculatorTierPrice(product,product?.component_type==="module"?"gold":"default");}
function calculatorTierPrice(product,tier){
  if(!product)return null;
  if(tier==="gold"&&product.component_type!=="module")tier="default";
  if(product?.prices?.[tier]!==null&&product?.prices?.[tier]!==undefined)return Number(product.prices[tier]);
  const metadata=product.technical_metadata||{};
  const technology=String(metadata.technology||"").toLowerCase();
  const location=String(metadata.location||"indoor").toLowerCase();
  const modelId=metadata.id||product.source_key?.split(":").pop();
  const brand=product.brand_name||product.brand||"";
  const branded=componentModelAndPrice.moduleBrandPrices?.[brand]?.[modelId]?.[tier];
  if(branded!==undefined)return Number(branded);
  const base=componentModelAndPrice.modelGroups?.[technology]?.[location]?.find((item)=>item.id===modelId||cleanModelName(item.name)===cleanModelName(product.model))?.prices?.[tier];
  return base===undefined?null:Number(base);
}
function titleCase(value){return String(value).replace(/[_-]/g," ").replace(/\b\w/g,(letter)=>letter.toUpperCase());}
function slugify(value){return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function systemIcon(type){return {"led-display":"▣","rental-led":"▤","pa-system":"♫","conference-system":"♙"}[type]||"□";}
function categoryIcon(type){return {"led-display":"▦","rental-led":"▥","pa-system":"♬","conference-system":"♙"}[type]||"□";}
