import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logic_step_types from './logic_step_types.js';
import step_types from './step_types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generates a mapping of Step class names to their step_name identifiers by reading
 * class files from the filesystem. This approach avoids circular dependencies that would
 * occur if we imported the Step classes directly.
 * 
 * The function parses each class file to extract:
 * - The class name from the export statement
 * - The static step_name property value
 * 
 * When step_name references an enum (e.g., logic_step_types.CONDITIONAL), the function
 * resolves the actual string value from the imported enum objects.
 * 
 * @returns {Object.<string, string|null>} An object mapping class names to their step_name values.
 *   Classes without a step_name property are mapped to null.
 * @example
 * // Returns:
 * // {
 * //   "ActionStep": "action",
 * //   "ConditionalStep": "conditional",
 * //   "Step": null,
 * //   ...
 * // }
 */
const generate_sub_step_types = () => {
  const types = {};
  const classesDir = join(__dirname, '../classes');
  
  // Combine all enums into one lookup object
  const allEnums = {
    logic_step_types,
    step_types
  };
  
  // Read all files in the classes directory
  const files = readdirSync(classesDir).filter(file => file.endsWith('.js') && file !== 'index.js');
  
  for (const file of files) {
    const filePath = join(classesDir, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Extract class name from the file content
    const classNameMatch = content.match(/export default class (\w+)/);
    if (!classNameMatch) continue;
    
    const className = classNameMatch[1];
    
    // Extract static step_name value
    const stepNameMatch = content.match(/static step_name\s*=\s*['"`]?([^'"`;\n]+)['"`]?/);
    
    if (stepNameMatch) {
      let stepName = stepNameMatch[1].trim();
      
      // Handle cases where step_name references an enum
      // e.g., logic_step_types.CONDITIONAL or step_types.SUBFLOW
      if (stepName.includes('.')) {
        const [enumName, enumKey] = stepName.split('.');
        
        // Look up the actual value from the imported enums
        if (allEnums[enumName] && allEnums[enumName][enumKey]) {
          stepName = allEnums[enumName][enumKey];
        } else {
          stepName = null;
        }
      }
      
      types[className] = stepName;
    } else {
      types[className] = null;
    }
  }
  
  return types;
}

export default generate_sub_step_types();
