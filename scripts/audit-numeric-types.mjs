import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const rows=[];
function hasNumber(n){if(!n)return false;if(n.kind===ts.SyntaxKind.NumberKeyword||ts.isNumericLiteral(n))return true;if(ts.isIndexedAccessTypeNode(n)||ts.isTypeQueryNode(n))return false;return n.getChildren().some(hasNumber);}
for(const root of ['src/core','src/data'])for(const name of fs.readdirSync(root).sort()){
 if(!name.endsWith('.ts')||name.endsWith('.test.ts'))continue;
 const file=path.join(root,name),source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 for(const node of source.statements){if(!ts.isInterfaceDeclaration(node)&&!ts.isTypeAliasDeclaration(node))continue;
 const visit=n=>{if(ts.isPropertySignature(n)&&n.type&&hasNumber(n.type)){const line=source.getLineAndCharacterOfPosition(n.getStart()).line+1;rows.push([file,node.name.text,n.name.getText(source),n.type.getText(source).replaceAll('|','\\|').replaceAll('\n',' '),line]);return;}ts.forEachChild(n,visit);};visit(node);
 }
}
const out='# 数值字段声明清单\n\n由 `node scripts/audit-numeric-types.mjs` 从 src/core 与 src/data 的接口、类型声明提取。含嵌套数值、数值字面量及数值容器；版本、ID、日期、随机种子也列入，不能都视为可花费资源。运行时派生公式和配置常量的用途见《数值资源与机制影响审计》，此表不等于机制正确性证明。\n\n声明条目：'+rows.length+'。\n\n| 文件 | 类型 | 字段 | 声明 | 行 |\n| --- | --- | --- | --- | --- |\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
fs.writeFileSync('docs/数值字段清单.md',out);
console.log(`Indexed ${rows.length} numeric declarations.`);
