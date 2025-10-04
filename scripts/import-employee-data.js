const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function importEmployeeData() {
  try {
    console.log('Starting employee data import...')
    
    // Read the synthetic employee data
    const dataPath = path.join(__dirname, '..', 'Simplify App with Semantic Search and Employee Features', 'synthetic_employee_data.json')
    const employeeData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    
    console.log(`Found ${employeeData.length} employees to import`)
    
    // Insert employees in batches
    const batchSize = 10
    for (let i = 0; i < employeeData.length; i += batchSize) {
      const batch = employeeData.slice(i, i + batchSize)
      
      console.log(`Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(employeeData.length / batchSize)}`)
      
      const { data, error } = await supabase
        .from('employees')
        .insert(batch)
      
      if (error) {
        console.error('Error importing batch:', error)
        throw error
      }
      
      console.log(`Successfully imported ${batch.length} employees`)
    }
    
    console.log('Employee data import completed successfully!')
    
    // Verify the import
    const { count, error: countError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error verifying import:', countError)
    } else {
      console.log(`Total employees in database: ${count}`)
    }
    
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

// Run the import
importEmployeeData()
