require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Owner mapping from API
const OWNERS = {
  '81280578': { name: 'Abd alslam Sharqawi', role: 'sales_manager' },
  '1315760486': { name: 'areej Harb', role: 'customer_success' },
  '83618074': { name: 'Bisan Jaffari', role: 'followup_specialist' },
  '154887582': { name: 'Fady Safwat', role: 'customer_success' },
  '82827834': { name: 'Leonid Shvorob', role: 'other' },
  '726197388': { name: 'Mothanna Alawneh', role: 'sales_manager' },
  '682432124': { name: 'Shadi Halloun', role: 'other' },
  '687247262': { name: "Wala' M Hassan", role: 'sales_manager' }
};

const SALES_MANAGERS = ['81280578', '726197388', '687247262'];
const FOLLOWUP = ['83618074'];
const IGNORE = ['1315760486', '154887582'];

(async () => {
  console.log('='.repeat(80));
  console.log('CALL-TO-CLOSE RATE ANALYSIS');
  console.log('='.repeat(80));

  const stats = [];

  for (const [ownerId, info] of Object.entries(OWNERS)) {
    // Get calls count
    const { data: callsData } = await supabase
      .from('call_contact_matches_mv')
      .select('call_id')
      .eq('hubspot_owner_id', ownerId);

    const callsCount = callsData?.length || 0;

    // Get deals
    const { data: deals } = await supabase
      .from('hubspot_deals_raw')
      .select('dealstage, amount')
      .eq('hubspot_owner_id', ownerId);

    const totalDeals = deals?.length || 0;
    const closedWon = deals?.filter(d => d.dealstage === 'closedwon').length || 0;
    const totalRevenue = deals
      ?.filter(d => d.dealstage === 'closedwon')
      .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0;

    const callToCloseRate = callsCount > 0 ? ((closedWon / callsCount) * 100).toFixed(2) : '0.00';
    const dealConversionRate = totalDeals > 0 ? ((closedWon / totalDeals) * 100).toFixed(2) : '0.00';

    stats.push({
      ownerId,
      name: info.name,
      role: info.role,
      calls: callsCount,
      deals: totalDeals,
      closedWon,
      revenue: totalRevenue,
      callToCloseRate: parseFloat(callToCloseRate),
      dealConversionRate: parseFloat(dealConversionRate)
    });
  }

  // Sort by role importance
  const roleOrder = { sales_manager: 1, followup_specialist: 2, other: 3, customer_success: 4 };
  stats.sort((a, b) => {
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    return b.closedWon - a.closedWon;
  });

  console.log('\n📊 INDIVIDUAL STATS:\n');

  stats.forEach(s => {
    const emoji = s.role === 'sales_manager' ? '🎯' :
                  s.role === 'followup_specialist' ? '📞' :
                  s.role === 'customer_success' ? '🤝' : '📋';

    console.log(`${emoji} ${s.name} (${s.role})`);
    console.log(`   Calls: ${s.calls}`);
    console.log(`   Deals: ${s.deals} (${s.closedWon} closed won)`);
    console.log(`   Call-to-Close Rate: ${s.callToCloseRate}%`);
    console.log(`   Deal Conversion Rate: ${s.dealConversionRate}%`);
    console.log(`   Revenue: $${s.revenue.toFixed(2)}`);
    console.log('');
  });

  // Team summary
  console.log('='.repeat(80));
  console.log('\n📈 TEAM SUMMARY (Sales Managers Only):\n');

  const salesManagersStats = stats.filter(s => SALES_MANAGERS.includes(s.ownerId));
  const totalCalls = salesManagersStats.reduce((sum, s) => sum + s.calls, 0);
  const totalClosedWon = salesManagersStats.reduce((sum, s) => sum + s.closedWon, 0);
  const totalRevenue = salesManagersStats.reduce((sum, s) => sum + s.revenue, 0);

  console.log(`Total Sales Managers: ${salesManagersStats.length}`);
  console.log(`Total Calls: ${totalCalls}`);
  console.log(`Total Closed Won: ${totalClosedWon}`);
  console.log(`Team Call-to-Close Rate: ${((totalClosedWon / totalCalls) * 100).toFixed(2)}%`);
  console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);

  console.log('\n='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:\n');
  console.log('1. Track "Call-to-Close Rate" for Sales Managers (Wala, Mothanna, Abd Elsalam)');
  console.log('2. Track "Deal Conversion Rate" separately (Deals → Closed Won)');
  console.log('3. Ignore Customer Success (Areej, Fady) from sales metrics');
  console.log('4. Track Bisan separately as "Follow-up Specialist" metric');
})();
