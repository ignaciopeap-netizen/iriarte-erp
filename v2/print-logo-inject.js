// Inject the official logo into printable budget/invoice windows without coupling document modules to image storage.
(function(){
  'use strict';
  if(window.__iriartePrintLogoInstalled)return;
  window.__iriartePrintLogoInstalled=true;
  const nativeOpen=window.open.bind(window);
  window.open=function(...args){
    const child=nativeOpen(...args),logo=window.IRIARTE_LOGO_DATA_URI;
    if(!child||!logo)return child;
    try{
      const nativeWrite=child.document.write.bind(child.document);
      child.document.write=function(...chunks){
        let html=chunks.join('');
        const image=`<img class="iriarte-official-logo" src="${logo}" alt="Sonsoles Pérez Iriarte">`;
        html=html.replace('<div class="pp-brand">Sonsoles Pérez Iriarte</div><div class="pp-subbrand">JARDINERÍA Y PAISAJISMO</div>',image);
        html=html.replace('<div class="brand">Sonsoles Pérez Iriarte</div><div class="sub">JARDINERÍA Y PAISAJISMO</div>',image);
        html=html.replace('</style>','.iriarte-official-logo{display:block;width:auto;height:92px;object-fit:contain;object-position:left top} </style>');
        return nativeWrite(html);
      };
    }catch(_){/* if the popup is unavailable, the original print code continues */}
    return child;
  };
})();
