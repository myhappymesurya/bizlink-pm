'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type DashboardStats = {
  totalAssets: number
  activeAssets: number
  expiredAssets: number
  maintenanceAssets: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeAssets: 0,
    expiredAssets: 0,
    maintenanceAssets: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const { data } = await supabase
        .from('assets')
        .select('status')
        .limit(1000)

      const assets = data || []
      setStats({
        totalAssets: assets.length,
        activeAssets: assets.filter((a: any) => a.status === 'active').length,
        expiredAssets: assets.filter((a: any) => a.status === 'expired').length,
        maintenanceAssets: assets.filter((a: any) => a.status === 'maintenance').length
      })
    } catch (e) {
      console.error('Error loading stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = [
    { name: 'Active', value: stats.activeAssets },
    { name: 'Expired', value: stats.expiredAssets },
    { name: 'Maintenance', value: stats.maintenanceAssets }
  ]

  const COLORS = ['#27ae60', '#e74c3c', '#f39c12']

  const KPICard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <div style={{
      background: 'var(--bg-card)',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: 'var(--shadow)',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{ fontSize: '32px', opacity: 0.7 }}>{icon}</div>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>{title}</p>
        <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{value}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overview of your preventive maintenance system</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>Loading dashboard...</div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <KPICard title="Total Assets" value={stats.totalAssets} icon="📦" color="var(--primary)" />
              <KPICard title="Active Assets" value={stats.activeAssets} icon="🟢" color="var(--success)" />
              <KPICard title="Expired Assets" value={stats.expiredAssets} icon="🔴" color="var(--danger)" />
              <KPICard title="In Maintenance" value={stats.maintenanceAssets} icon="🔧" color="var(--warning)" />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px'
            }}>
              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--shadow)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>
                  Asset Status Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--shadow)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>
                  Asset Status Summary
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>🟢 Active</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>
                      {stats.activeAssets} ({Math.round((stats.activeAssets / stats.totalAssets) * 100)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>🔴 Expired</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--danger)' }}>
                      {stats.expiredAssets} ({Math.round((stats.expiredAssets / stats.totalAssets) * 100)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>🔧 Maintenance</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--warning)' }}>
                      {stats.maintenanceAssets} ({Math.round((stats.maintenanceAssets / stats.totalAssets) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="/assets" style={{
                padding: '12px 24px',
                background: 'var(--secondary)',
                color: 'var(--primary)',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '14px',
                display: 'inline-block'
              }}>
                📋 Manage Assets
              </a>
              <a href="/checklist" style={{
                padding: '12px 24px',
                background: 'var(--primary)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '14px',
                display: 'inline-block'
              }}>
                ✓ View Checklists
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}