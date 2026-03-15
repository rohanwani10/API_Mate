export function generateDartCode(className: string, schemaStr: string): string {
    try {
        const schema = JSON.parse(schemaStr);
        if (schema.type !== 'object' || !schema.properties) {
             return "// Error: Root schema must be an object with properties";
        }

        let dartCode = `class ${className} {\n`;
        const props = schema.properties;
        const required = schema.required || [];

        // Fields
        for (const [key, value] of Object.entries<any>(props)) {
            let dartType = 'dynamic';
            if (value.type === 'string') dartType = 'String';
            else if (value.type === 'number' || value.type === 'integer') dartType = 'num';
            else if (value.type === 'boolean') dartType = 'bool';

            const isNullable = !required.includes(key) ? '?' : '';
            dartCode += `  final ${dartType}${isNullable} ${key};\n`;
        }

        // Constructor
        dartCode += `\n  ${className}({\n`;
        for (const [key, value] of Object.entries<any>(props)) {
            const isReq = required.includes(key) ? 'required ' : '';
            dartCode += `    ${isReq}this.${key},\n`;
        }
        dartCode += `  });\n\n`;

        // fromJson
        dartCode += `  factory ${className}.fromJson(Map<String, dynamic> json) {\n`;
        dartCode += `    return ${className}(\n`;
        for (const [key, value] of Object.entries<any>(props)) {
            dartCode += `      ${key}: json['${key}'],\n`;
        }
        dartCode += `    );\n  }\n\n`;

        // toJson
        dartCode += `  Map<String, dynamic> toJson() {\n`;
        dartCode += `    return {\n`;
        for (const [key, value] of Object.entries<any>(props)) {
            dartCode += `      '${key}': ${key},\n`;
        }
        dartCode += `    };\n  }\n`;

        dartCode += `}\n`;
        return dartCode;

    } catch (e) {
        return "// Error parsing schema: " + (e as Error).message;
    }
}

export function generateJavaCode(className: string, schemaStr: string): string {
    try {
        const schema = JSON.parse(schemaStr);
        if (schema.type !== 'object' || !schema.properties) {
             return "// Error: Root schema must be an object with properties";
        }

        let javaCode = `import com.fasterxml.jackson.annotation.JsonProperty;\n\n`;
        javaCode += `public class ${className} {\n`;
        const props = schema.properties;

        // Fields
        for (const [key, value] of Object.entries<any>(props)) {
            let javaType = 'Object';
            if (value.type === 'string') javaType = 'String';
            else if (value.type === 'number') javaType = 'Double';
            else if (value.type === 'integer') javaType = 'Integer';
            else if (value.type === 'boolean') javaType = 'Boolean';

            javaCode += `    @JsonProperty("${key}")\n`;
            javaCode += `    private ${javaType} ${key};\n\n`;
        }

        // Getters & Setters
        for (const [key, value] of Object.entries<any>(props)) {
             let javaType = 'Object';
             if (value.type === 'string') javaType = 'String';
             else if (value.type === 'number') javaType = 'Double';
             else if (value.type === 'integer') javaType = 'Integer';
             else if (value.type === 'boolean') javaType = 'Boolean';

             const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
             
             // Getter
             javaCode += `    public ${javaType} get${capitalized}() {\n`;
             javaCode += `        return ${key};\n`;
             javaCode += `    }\n\n`;

             // Setter
             javaCode += `    public void set${capitalized}(${javaType} ${key}) {\n`;
             javaCode += `        this.${key} = ${key};\n`;
             javaCode += `    }\n\n`;
        }

        javaCode += `}\n`;
        return javaCode;

    } catch (e) {
        return "// Error parsing schema: " + (e as Error).message;
    }
}
