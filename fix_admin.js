const fs = require('fs');
const path = require('path');

// Read the Admin.js file
const adminFilePath = path.join(__dirname, 'src', 'components', 'Admin.js');
let content = fs.readFileSync(adminFilePath, 'utf8');

// Fix the common syntax errors

// 1. Fix missing closing section tag
if (content.includes('<section className="admin" id="admin">') && 
    !content.includes('</section>')) {
  console.log('Fixing missing closing section tag');
  content = content.replace('</div>\n  );', '</div>\n    </section>\n  );');
}

// 2. Fix expected colon errors in ternary operators
// This replaces any ternary operators that might be missing the colon
content = content.replace(/\? ([^:]+)(?=\n|\s*\))/g, '? $1 :');

// 3. Fix missing closing div tags
const openDivCount = (content.match(/<div/g) || []).length;
const closeDivCount = (content.match(/<\/div>/g) || []).length;
console.log(`Found ${openDivCount} opening div tags and ${closeDivCount} closing div tags`);

if (openDivCount > closeDivCount) {
  const missingCloseDivs = openDivCount - closeDivCount;
  console.log(`Adding ${missingCloseDivs} missing closing div tags`);
  
  // Add missing closing divs before the section closing tag
  content = content.replace('</section>\n  );', '\n      '.repeat(missingCloseDivs) + '</div>'.repeat(missingCloseDivs) + '\n    </section>\n  );');
}

// 4. Fix missing closing braces
const openBraceCount = (content.match(/{/g) || []).length;
const closeBraceCount = (content.match(/}/g) || []).length;
console.log(`Found ${openBraceCount} opening braces and ${closeBraceCount} closing braces`);

if (openBraceCount > closeBraceCount) {
  const missingCloseBraces = openBraceCount - closeBraceCount;
  console.log(`Adding ${missingCloseBraces} missing closing braces`);
  
  // Add missing closing braces before the export
  const exportIndex = content.lastIndexOf('export default Admin;');
  if (exportIndex !== -1) {
    const beforeExport = content.substring(0, exportIndex);
    const afterExport = content.substring(exportIndex);
    content = beforeExport + '}'.repeat(missingCloseBraces) + '\n\n' + afterExport;
  }
}

// 5. Check for other specific errors
// Look for unexpected tokens like unclosed JSX elements
const jsxTags = ['button', 'div', 'span', 'p', 'h3', 'ul', 'li', 'section'];
jsxTags.forEach(tag => {
  const openTagCount = (content.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const closeTagCount = (content.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  console.log(`Tag ${tag}: ${openTagCount} opening, ${closeTagCount} closing`);
});

// 6. Ensure the banUser function is properly implemented and not duplicated
if (content.indexOf('const banUser =') !== content.lastIndexOf('const banUser =')) {
  console.log('Found duplicate banUser function, removing...');
  
  // Keep only the first instance of the banUser function
  const firstInstance = content.indexOf('const banUser =');
  const secondInstance = content.indexOf('const banUser =', firstInstance + 1);
  
  // Look for the end of the second function (next function declaration or return statement)
  let endOfSecondFunction = content.indexOf('const ', secondInstance + 1);
  if (endOfSecondFunction === -1) {
    endOfSecondFunction = content.indexOf('return', secondInstance + 1);
  }
  
  if (endOfSecondFunction !== -1) {
    const beforeDuplicate = content.substring(0, secondInstance);
    const afterDuplicate = content.substring(endOfSecondFunction);
    content = beforeDuplicate + afterDuplicate;
  }
}

// Write the fixed content back to the file
fs.writeFileSync(adminFilePath, content, 'utf8');
console.log('Fixed Admin.js file written successfully.');
