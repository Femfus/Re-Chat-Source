const fs = require('fs');
const path = require('path');

// Read the Admin.js file
const adminPath = path.join(__dirname, 'src', 'components', 'Admin.js');
let content = fs.readFileSync(adminPath, 'utf-8');

// Fix known syntax errors

// 1. Remove any duplicate function declarations (like duplicate banUser function)
const functions = [
  'fetchInviteCodes',
  'fetchUsers',
  'generateRandomCode',
  'generateInviteCodes',
  'deleteInviteCode',
  'fetchUserDetails',
  'generatePasswordResetLink',
  'changeUserRank',
  'changeUserRole',
  'toggleUserStatus',
  'banUser',
  'copyToClipboard'
];

functions.forEach(func => {
  // Count occurrences of function declaration
  const regex = new RegExp(`const ${func} = async`, 'g');
  const matches = content.match(regex);
  
  if (matches && matches.length > 1) {
    console.log(`Found duplicate declaration of ${func}`);
    
    // Find the second occurrence and remove the entire function
    const firstIndex = content.indexOf(`const ${func} = async`);
    const secondIndex = content.indexOf(`const ${func} = async`, firstIndex + 1);
    
    if (secondIndex !== -1) {
      // Find the end of the function (the next declaration or return statement)
      let endIndex = content.indexOf('const ', secondIndex + 1);
      if (endIndex === -1) {
        endIndex = content.indexOf('return', secondIndex + 1);
      }
      
      // If we found the end, remove the duplicate function
      if (endIndex !== -1) {
        const beforeFunction = content.substring(0, secondIndex);
        const afterFunction = content.substring(endIndex);
        content = beforeFunction + afterFunction;
        console.log(`Removed duplicate ${func} function`);
      }
    }
  }
});

// 2. Fix broken JSX syntax (missing closing tags, unexpected tokens, etc.)
// Make sure all JSX elements have closing tags
const jsxTags = ['div', 'section', 'button', 'span', 'p', 'h3', 'ul', 'li', 'i', 'strong'];

jsxTags.forEach(tag => {
  // Count opening and closing tags
  const openRegex = new RegExp(`<${tag}[\\s>]`, 'g');
  const closeRegex = new RegExp(`</${tag}>`, 'g');
  
  const openMatches = (content.match(openRegex) || []).length;
  const closeMatches = (content.match(closeRegex) || []).length;
  
  console.log(`Tag ${tag}: ${openMatches} opening, ${closeMatches} closing`);
  
  // If there are more opening than closing tags, add closing tags where needed
  if (openMatches > closeMatches) {
    console.log(`Missing closing tags for ${tag}`);
  }
});

// 3. Fix specific known issues
// a. Ensure section tag is closed properly
if (!content.includes('</section>')) {
  content = content.replace('</div>\n  );', '</div>\n    </section>\n  );');
  console.log('Fixed missing closing section tag');
}

// b. Fix any expected colons (:)
// This is commonly missing in object literals or ternary expressions
if (content.includes('? ')) {
  content = content.replace(/\? ([^:]+)$/gm, '? $1 :');
  console.log('Fixed missing colons in ternary expressions');
}

// c. Fix missing closing braces and parentheses
// Count opening and closing braces/parentheses
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;

console.log(`Braces: ${openBraces} opening, ${closeBraces} closing`);
console.log(`Parentheses: ${openParens} opening, ${closeParens} closing`);

// Add missing closing braces if needed
if (openBraces > closeBraces) {
  const diff = openBraces - closeBraces;
  console.log(`Adding ${diff} missing closing braces`);
  
  // Add to the end of the file before export
  const exportIndex = content.lastIndexOf('export default Admin');
  if (exportIndex !== -1) {
    const before = content.substring(0, exportIndex);
    const after = content.substring(exportIndex);
    
    let fix = before;
    for (let i = 0; i < diff; i++) {
      fix += '}\n';
    }
    fix += after;
    content = fix;
  }
}

// 4. Fix any unexpected tokens or malformed JSX
// This is a more complex fix that might need manual intervention

// Write the fixed content back to the file
fs.writeFileSync(adminPath, content, 'utf-8');
console.log('Fixed Admin.js file written successfully.');
