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
 * The built-in classes directory is always scanned. Additional directories can be provided
 * to scan for custom step classes. This is typically used via workflow.sub_step_type_paths,
 * which is merged with the default when setWorkflow() is called on a step.
 * 
 * @param {string[]} directories - An array of additional directory paths to scan for class files. 
 *   The built-in classes directory is always included. Defaults to an empty array.
 * @returns {Object.<string, string|null>} An object mapping class names to their step_name values.
 *   Classes without a step_name property are mapped to null.
 * @example
 * // Returns:
 * // {
 * //   "Step": null,
 * //   "ConditionalStep": "conditional",
 * //   "LogicStep": "logic",
 * //   ...
 * // }
 */
const generate_sub_step_types = (directories = []) => {
  const types = {};
  
  // Always include the classes directory, then append any additional directories
  directories.push(join(__dirname, '../classes'));
  
  // Combine all enums into one lookup object
  const allEnums = {
    logic_step_types,
    step_types
  };
  
  // Scan each directory in the array
  for (const dir of directories) {
    // Read all files in the current directory
    const files = readdirSync(dir).filter(file => file.endsWith('.js') && file !== 'index.js');
    
    for (const file of files) {
      const filePath = join(dir, file);
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
        // e.g., logic_step_types.CONDITIONAL or step_types.ACTION
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
  }
  
  return types;
}

export default generate_sub_step_types;
