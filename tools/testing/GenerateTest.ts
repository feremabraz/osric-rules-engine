#!/usr/bin/env node

/**
 * OSRIC Rules Engine - Automated Test File Generator
 *
 * This script reads the TestTemplate.md, injects type/interface definitions
 * from the codebase, and generates skeleton test files with all required
 * context setup, mocks, and error checks.
 *
 * Usage: node tools/GenerateTest.ts <ComponentName> <Category> <ComponentType>
 * Example: node tools/GenerateTest.ts AttackRoll rules Rule
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

interface ComponentInfo {
  name: string;
  category: string;
  type: 'Rule' | 'Command';
  filePath: string;
  contextDataKey: string;
  commandType: string;
}

class TestGenerator {
  private projectRoot: string;
  private templateContent = '';
  private codebaseTypes: Set<string> = new Set();

  constructor() {
    this.projectRoot = resolve();
  }

  async run(componentName: string, category: string, componentType: string): Promise<void> {
    try {
      console.log(`🚀 Generating test for ${componentName} (${componentType} in ${category})`);

      // Step 1: Load template
      await this.loadTemplate();

      // Step 2: Analyze codebase types
      await this.analyzeCodebaseTypes();

      // Step 3: Get component info
      const componentInfo = await this.getComponentInfo(
        componentName,
        category,
        componentType as 'Rule' | 'Command'
      );

      // Step 4: Generate test file
      const testContent = await this.generateTestFile(componentInfo);

      // Step 5: Write test file
      await this.writeTestFile(componentInfo, testContent);

      console.log(
        `✅ Test file generated successfully: __tests__/${category}/${componentName}.test.ts`
      );
    } catch (error) {
      console.error(
        `❌ Error generating test: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  }

  private async loadTemplate(): Promise<void> {
    try {
      const templatePath = join(this.projectRoot, 'tools', 'progress', 'TestTemplate.md');
      this.templateContent = await fs.readFile(templatePath, 'utf-8');
      console.log('📋 Template loaded successfully');
    } catch (error) {
      throw new Error(
        `Failed to load template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async analyzeCodebaseTypes(): Promise<void> {
    console.log('🔍 Analyzing codebase types...');

    // Analyze key type files
    await this.analyzeTypeFile('osric/types/entities.ts');
    await this.analyzeTypeFile('osric/types/constants.ts');
    await this.analyzeTypeFile('osric/types/commands.ts');
    await this.analyzeTypeFile('osric/types/rules.ts');

    console.log(`📊 Found ${this.codebaseTypes.size} type definitions`);
  }

  private async analyzeTypeFile(filePath: string): Promise<void> {
    try {
      const fullPath = join(this.projectRoot, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      // Extract interface and type definitions
      const typeRegex = /(?:export\s+)?(?:interface|type|enum|class)\s+(\w+)/g;
      let match: RegExpExecArray | null;

      match = typeRegex.exec(content);
      while (match !== null) {
        this.codebaseTypes.add(match[1]);
        match = typeRegex.exec(content);
      }
    } catch {
      // File might not exist, continue
    }
  }

  private async getComponentInfo(
    componentName: string,
    category: string,
    componentType: 'Rule' | 'Command'
  ): Promise<ComponentInfo> {
    const filePath = join(this.projectRoot, 'osric', category, `${componentName}.ts`);

    try {
      await fs.access(filePath);
    } catch {
      console.log(`⚠️  Component file not found, using defaults: ${filePath}`);
    }

    return {
      name: componentName,
      category,
      type: componentType,
      filePath,
      contextDataKey: this.generateContextDataKey(componentName),
      commandType:
        componentType === 'Command'
          ? `COMMAND_TYPES.${this.convertToConstant(componentName)}`
          : 'N/A',
    };
  }

  private generateContextDataKey(componentName: string): string {
    return `${componentName.charAt(0).toLowerCase()}${componentName.slice(1)}Data`;
  }

  private convertToConstant(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .substring(1);
  }

  private async generateTestFile(componentInfo: ComponentInfo): Promise<string> {
    console.log('🏗️  Generating test content...');

    // Extract the TypeScript template from the first code block
    const codeBlockStart = this.templateContent.indexOf('```typescript');
    if (codeBlockStart === -1) {
      throw new Error('Could not find TypeScript code block in TestTemplate.md');
    }

    const contentStart = this.templateContent.indexOf('\n', codeBlockStart) + 1;
    const codeBlockEnd = this.templateContent.indexOf('```', contentStart);

    if (codeBlockEnd === -1) {
      throw new Error('Could not find end of TypeScript code block in TestTemplate.md');
    }

    let testContent = this.templateContent.substring(contentStart, codeBlockEnd).trim();
    console.log(`📄 Extracted template (${testContent.length} chars)`);

    // Replace template placeholders
    testContent = testContent
      .replace(/\[COMPONENT_NAME\]/g, componentInfo.name)
      .replace(/\[CATEGORY\]/g, componentInfo.category)
      .replace(/\[CONTEXT_DATA_KEY\]/g, componentInfo.contextDataKey)
      .replace(/\[category\]/g, componentInfo.category)
      .replace(/\[ComponentName\]/g, componentInfo.name);

    // Add additional types if we found any relevant ones
    const additionalTypes = Array.from(this.codebaseTypes)
      .filter((type) => type !== 'Character' && !type.includes('Test') && !type.includes('Mock'))
      .slice(0, 5)
      .join(', ');

    testContent = testContent.replace(/\[ADDITIONAL_TYPES\]/g, additionalTypes || 'GameState');

    // Handle command-specific replacements
    if (componentInfo.type === 'Command') {
      testContent = testContent.replace(/\[COMMAND_TYPE\]/g, componentInfo.commandType);
    } else {
      // For Rules, we don't need command types
      testContent = testContent.replace(
        /COMMAND_TYPES\.\[COMMAND_TYPE\]/g,
        'RULE_NAMES.SAMPLE_RULE'
      );
    }

    return testContent;
  }

  private async writeTestFile(componentInfo: ComponentInfo, content: string): Promise<void> {
    const testDir = join(this.projectRoot, '__tests__', componentInfo.category);
    const testFile = join(testDir, `${componentInfo.name}.test.ts`);

    // Ensure directory exists
    await fs.mkdir(testDir, { recursive: true });

    // Write the test file
    await fs.writeFile(testFile, content, 'utf-8');

    console.log(`📝 Test file written to: ${testFile}`);
  }
}

// Main execution
const [, , componentName, category, componentType] = process.argv;

if (!componentName || !category || !componentType) {
  console.error('❌ Usage: node tools/GenerateTest.ts <ComponentName> <Category> <ComponentType>');
  console.error('   Example: node tools/GenerateTest.ts AttackRoll rules Rule');
  process.exit(1);
}

const generator = new TestGenerator();
generator.run(componentName, category, componentType).catch(console.error);
