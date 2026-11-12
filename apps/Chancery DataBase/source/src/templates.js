module.exports = {
  blank: { sql: [], objects: [] },

  contacts: {
    sql: [
      `CREATE TABLE "Contacts" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT, "First Name" TEXT NOT NULL, "Last Name" TEXT, "Company" TEXT, "Email" TEXT, "Phone" TEXT, "Birthday" DATE, "Notes" LONGTEXT)`,
      `INSERT INTO "Contacts" ("First Name","Last Name","Company","Email","Phone","Birthday") VALUES
        ('Ada','Quill','Quill & Sons','ada@example.com','555-0101','1988-03-14'),
        ('Marco','Reyes','Northwind Supply','marco@example.com','555-0102','1979-11-02'),
        ('Lena','Okafor','Harbor Studio','lena@example.com','555-0103','1992-07-29')`
    ],
    objects: [
      { kind: 'query', name: 'Contacts by Last Name', def: { sql: 'SELECT "First Name", "Last Name", "Email", "Phone"\nFROM "Contacts"\nORDER BY "Last Name" ASC' } },
      { kind: 'form', name: 'Contact Form', def: { table: 'Contacts' } },
      { kind: 'report', name: 'Contact List', def: { source: { kind: 'table', name: 'Contacts' }, title: 'Contact List', columns: ['First Name', 'Last Name', 'Company', 'Email', 'Phone'], groupBy: '', totals: false } }
    ]
  },

  inventory: {
    sql: [
      `CREATE TABLE "Products" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT, "SKU" TEXT NOT NULL, "Product" TEXT NOT NULL, "Category" TEXT, "Price" CURRENCY DEFAULT 0, "Stock" INTEGER DEFAULT 0, "Reorder Level" INTEGER DEFAULT 5, "Discontinued" BOOLEAN DEFAULT 0)`,
      `INSERT INTO "Products" ("SKU","Product","Category","Price","Stock","Reorder Level") VALUES
        ('HW-1001','Claw hammer','Hardware',14.5,40,10),
        ('HW-1002','Socket set','Hardware',39.99,4,8),
        ('GD-2001','Garden hose','Garden',22,17,6),
        ('GD-2002','Pruning shears','Garden',18.75,3,5)`
    ],
    objects: [
      { kind: 'query', name: 'Low Stock', def: { sql: 'SELECT "SKU", "Product", "Stock", "Reorder Level"\nFROM "Products"\nWHERE "Stock" <= "Reorder Level"\nORDER BY "Stock" ASC' } },
      { kind: 'form', name: 'Product Form', def: { table: 'Products' } },
      { kind: 'report', name: 'Stock by Category', def: { source: { kind: 'table', name: 'Products' }, title: 'Stock by Category', columns: ['SKU', 'Product', 'Category', 'Price', 'Stock'], groupBy: 'Category', totals: true } }
    ]
  }
};
