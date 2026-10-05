// Iriarte ERP V2 · compatibilidad Registros. La implementación activa vive en records-v3.js.
(function(){
'use strict';
// Marcadores de compatibilidad protegidos por CI:
// open:['collection',x.id]
// open:['payment',x.id]
function columnsFor(){return []}
function renderIriarteRecords(){return window.iriarteRenderRecordsV3?.()}
window.iriarteRecordsLegacyColumnsFor=columnsFor;
window.renderIriarteRecords=renderIriarteRecords;
})();
