(() => {
 const check = (v, m) => { if (!v) throw new Error(m); };
 const change = (key, value) => { const el = document.getElementById('a-' + key); check(el, key); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); };
 check(document.querySelectorAll('nav button').length === 6, 'six tabs');
 change('inputMode','eps'); change('directEPS','1234'); change('eventSize','1');
 check(document.getElementById('content').innerText.includes('1,234'), 'direct EPS');
 change('inputMode','ingestion'); change('ingestion','88.4736');
 check(document.getElementById('content').innerText.includes('1,000'), 'ingestion');
 change('inputMode','eps'); change('setup','aio');
 document.querySelector('[data-retention="alertDays"][data-days="60"]').click();
 check(document.getElementById('a-alertDays').value === '60', 'retention');
 document.getElementById('theme-toggle').click();
 for (const tab of ['Cluster Specs','Physical Server','Device_EPS_Reference','Sizing_Rules','Sources','Calculator']) {
   document.querySelector('nav [data-tab="' + tab + '"]').click();
   check(document.getElementById('content').innerText.length > 100, tab);
 }
 document.getElementById('export').click();
 return 'PASS';
})();
