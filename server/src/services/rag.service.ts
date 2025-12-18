import databaseSchema from '../config/database-schema.json';

interface Column {
  name: string;
  type: string;
  description: string;
  businessMeaning?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  sampleValues?: any[];
  referencedTable?: string;
  referencedColumn?: string;
}

interface Table {
  tableName: string;
  description: string;
  businessDomain: string;
  dataCategory: string;
  primaryKey: string[];
  totalRecords?: number;
  columns: Column[];
}

interface DatabaseSchema {
  tables: Table[];
  relationships: Array<{
    parent: string;
    parentKey: string;
    child: string;
    childKey: string;
  }>;
}

// const schema = databaseSchema as DatabaseSchema;
const schema = databaseSchema as unknown as DatabaseSchema;


export const getSchemaContext = (): string => {
  let context = `
You are a SQL expert. Generate SQL queries based on the following database schema.

CRITICAL RULES:
1. Column names are CASE-SENSITIVE - use EXACT names as shown
2. Table names are CASE-SENSITIVE - use EXACT names as shown
3. Return ONLY the SQL query without markdown formatting
4. For single values, use aliases: SELECT COUNT(*) as value
5. For charts/aggregations, use pattern: SELECT category_column, SUM(value_column) as value FROM table GROUP BY category_column
6. For detailed lists/rows, SELECT specific columns. Do NOT aggregate if the user asks for details (e.g., "show me", "list", "details of").
7. Use JOINs to connect tables. 'application_user.USER_ID' links to 'claim.submitter_id'. 'claim.claim_id' links to 'recognition_claim.claim_id'.

DATABASE SCHEMA:

`;

  // Generate schema documentation from JSON
  schema.tables.forEach((table) => {
    context += `═══════════════════════════════════════════════════════════════════\n`;
    context += `TABLE: ${table.tableName}\n`;
    context += `Description: ${table.description}\n`;
    context += `Domain: ${table.businessDomain}`;
    if (table.totalRecords) {
      context += ` | Records: ${table.totalRecords.toLocaleString()}`;
    }
    context += `\n─────────────────────────────────────────────────────────────────────\n`;
    context += `Key Columns:\n`;

    // Group columns by importance
    const primaryKeys = table.columns.filter((col) => col.isPrimaryKey);
    const foreignKeys = table.columns.filter((col) => col.isForeignKey);
    const importantCols = table.columns.filter(
      (col) => !col.isPrimaryKey && !col.isForeignKey && col.sampleValues
    );
    const otherCols = table.columns.filter(
      (col) =>
        !col.isPrimaryKey &&
        !col.isForeignKey &&
        !col.sampleValues &&
        col.description
    );

    // Add primary keys first
    primaryKeys.forEach((col) => {
      context += `  - ${col.name} (${col.type}) - Primary Key`;
      if (col.description) context += ` - ${col.description}`;
      context += `\n`;
    });

    // Add foreign keys
    foreignKeys.forEach((col) => {
      context += `  - ${col.name} (${col.type}) - Foreign Key`;
      if (col.referencedTable) {
        context += ` → ${col.referencedTable}.${col.referencedColumn}`;
      }
      if (col.description) context += ` - ${col.description}`;
      context += `\n`;
    });

    // Add important columns with sample values
    importantCols.forEach((col) => {
      context += `  - ${col.name} (${col.type})`;
      if (col.description) context += ` - ${col.description}`;
      if (col.sampleValues && col.sampleValues.length > 0) {
        context += ` [e.g., ${col.sampleValues.slice(0, 3).join(', ')}]`;
      }
      context += `\n`;
    });

    // Add other columns (abbreviated)
    if (otherCols.length > 0) {
      const displayCols = otherCols.slice(0, 5);
      displayCols.forEach((col) => {
        context += `  - ${col.name} (${col.type})`;
        if (col.description) context += ` - ${col.description}`;
        context += `\n`;
      });
      if (otherCols.length > 5) {
        context += `  ... and ${otherCols.length - 5} more columns\n`;
      }
    }

    context += `\n`;
  });

  // Add relationships section
  context += `═══════════════════════════════════════════════════════════════════\n`;
  context += `COMMON RELATIONSHIPS:\n`;
  context += `─────────────────────────────────────────────────────────────────────\n`;
  schema.relationships.forEach((rel) => {
    context += `${rel.parent}.${rel.parentKey} → ${rel.child}.${rel.childKey}\n`;
  });

  // Add example queries
  context += `\n═══════════════════════════════════════════════════════════════════\n`;
  context += `EXAMPLE QUERIES:\n`;
  context += `─────────────────────────────────────────────────────────────────────\n`;
  context += `Count active users:
  SELECT COUNT(*) as value FROM application_user WHERE IS_ACTIVE = 1

Users by department:
  SELECT department_type as category, COUNT(*) as value 
  FROM participant_employer 
  WHERE termination_date IS NULL 
  GROUP BY department_type

Recent claims (last 30 days):
  SELECT claim_number, submission_date, submitter_id 
  FROM claim 
  WHERE submission_date >= SYSDATE - 30
  ORDER BY submission_date DESC

Recognition details for specific user (Complex Join):
  SELECT c.claim_id,
         c.submitter_id,
         sub_user.first_name,
         sub_user.last_name,
         rc.behavior,
         rc.submitter_comments
    FROM application_user rec_user
    JOIN claim_recipient cr 
      ON rec_user.user_id = cr.participant_id
    JOIN claim_item ci 
      ON cr.claim_item_id = ci.claim_item_id
    JOIN claim c 
      ON ci.claim_id = c.claim_id
    JOIN recognition_claim rc 
      ON c.claim_id = rc.claim_id
    JOIN application_user sub_user 
      ON c.submitter_id = sub_user.user_id
   WHERE rec_user.user_name = 'BHD-185'
   FETCH FIRST 10 ROWS ONLY

Recognition by behavior (Aggregation):
  SELECT r.behavior as category, COUNT(*) as value
  FROM recognition_claim r
  JOIN claim c ON r.claim_id = c.claim_id
  WHERE c.submission_date >= SYSDATE - 90
  GROUP BY r.behavior
`;

  return context;
};
