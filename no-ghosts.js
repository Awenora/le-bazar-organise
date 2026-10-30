function cleanDeletedStockCategoryPositions(categoryId){
 const matches=id=>stockLayoutTools.categoryId(id)===categoryId;
 const layouts=[data.inventory?.layout,data.visualPreferences?.stockLayout,visualEditSession?.draft.stockLayout,visualEditSession?.baseline.stockLayout];
 for(const layout of layouts)for(const mode of ['desktop','mobile'])for(const id of Object.keys(layout?.[mode]||{}))if(matches(id))delete layout[mode][id];
 for(const prefs of [data.visualPreferences,visualEditSession?.draft,visualEditSession?.baseline]){
  for(const key of Object.keys(prefs?.elements||{}))if(key==='stock-category:'+categoryId||key.startsWith('stock:')&&matches(key.slice(6)))delete prefs.elements[key];
  for(const key of Object.keys(prefs?.interfaceComponents?.elements||{}))if(key.startsWith('stock-extra:')&&matches(key.split(':').slice(2).join(':')))delete prefs.interfaceComponents.elements[key];
 }
}
