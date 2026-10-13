import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../../app/polished-workspace.css',import.meta.url),'utf8');
test('the star shading is strictly dark-mode-only; light and owner artwork stay plain',()=>{
 assert.match(css,/html\[data-theme="dark"\] \.app-shell \.dialer-cosmos:not\(\.is-custom\):after/);
 assert.doesNotMatch(css,/html\[data-theme\] \.app-shell \.dialer-cosmos:not\(\.is-custom\):after/);
 assert.match(css,/html\[data-theme="light"\].*\.dialer-cosmos:after\{display:none!important/);
});
test('the keypad uses natural content height and independent non-overlapping grid rows',()=>{
 assert.match(css,/data-dialer-widget="keypad".*\.dialer-widget-content\{height:auto!important;overflow:visible!important/);
 assert.match(css,/grid-template-rows:repeat\(4,60px\)/);
 assert.match(css,/max-width:1140px!important/);
 assert.doesNotMatch(css,/filter:\s*blur\(/);
});
