'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CATEGORIES_MAP } from '@/lib/constants'
import Navbar from '@/components/Navbar'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type KPI = {
  tasksToday: number
  overdueThisMonth: number
  issues: number
  activeEquipment: number
}

type CategoryStats = {
  name: string
  icon: string
  total: number
  completed: number
  pending: number
}

type RecentTask = {
  id: string
  asset_id: string
  category: string
  status: string
  submitted_at: string
}

const CATEGORY_ICONS: Record<string, string> = {
  'Fire Safety': '🔴',
  'HVAC': '❄️',
  'Electrical': '⚡',
  'Mechanical': '🔧'
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPI>({ tasksToday: 0, overdueThisMonth: 0, issues: 0, activeEquipment: 0 })
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [equipmentStatus, setEquipmentStatus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // 1. Load KPIs
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Tasks due today
      const { data: tasksToday } = await supabase
        .from('pm_schedules')
        .select('id')
        .eq('next_due_date', today)
        .eq('is_active', true)

      // Overdue this month
      const { data: overdue } = await supabase
        .from('pm_schedules')
        .select('id')
        .lte('next_due_date', today)
        .gte('next_due_date', monthStart)
        .eq('is_active', true)

      // Issues (NOK submissions)
      const { data: issues } = await supabase
        .from('checklist_submissions')
        .select('id')
        .eq('status', 'nok')

      // Active equipment
      const { data: active } = await supabase
        .from('assets')
        .select('id')
        .eq('is_active', true)

      setKpi({
        tasksToday: tasksToday?.length || 0,
        overdueThisMonth: overdue?.length || 0,
        issues: issues?.length || 0,
        activeEquipment: active?.length || 0
      })

      // 2. Load Category Stats
      const { data: allAssets } = await supabase
        .from('assets')
        .select('category')
        .eq('is_active', true)

      const { data: allSubmissions } = await supabase
        .from('checklist_submissions')
        .select('category, status')

      const catStats: Record<string, any> = {}
      Object.keys(CATEGORIES_MAP).forEach(cat => {
        catStats[cat] = { name: cat, icon: CATEGORY_ICONS[cat] || '📦', total: 0, completed: 0, pending: 0 }
      })

      allAssets?.forEach(asset => {
        if (asset.category && catStats[asset.category]) {
          catStats[asset.category].total++
        }
      })

      allSubmissions?.forEach(sub => {
        if (sub.category && catStats[sub.category]) {
          if (sub.status === 'ok') catStats[sub.category].completed++
          else catStats[sub.category].pending++
        }
      })

      setCategoryStats(Object.values(catStats))

      // 3. Load Recent Tasks
      const { data: recent } = await supabase
        .from('checklist_submissions')
        .select('id, asset_id, category, status, submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(8)

      setRecentTasks(recent || [])

      // 4. Chart Data (Mock trend - dalam production bisa dari actual data)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      setChartData(months.map((month, i) => ({
        month,
        completed: Math.floor(Math.random() * 100) + 50,
        pending: Math.floor(Math.random() * 50) + 10
      })))

      // 5. Equipment Status
      setEquipmentStatus([
        { name: 'Running', value: 34, color: '#10b981' },
        { name: 'Idle', value: 12, color: '#f59e0b' },
        { name: 'Maintenance', value: 8, color: '#ef4444' },
        { name: 'Breakdown', value: 3, color: '#8b5cf6' },
        { name: 'Decommissioned', value: 2, color: '#6b7280' }
      ])

      setLoading(false)
    } catch (error) {
      console.error('Dashboard load error:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'ok' ? '#10b981' : '#ef4444'
  }

  const getStatusBadge = (status: string) => {
    return status === 'ok' ? '✓ OK' : '✗ NOK'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Maintenance Dashboard</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — Real-time overview
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'TUGAS HARI INI', value: kpi.tasksToday, subtext: 'Belum ada yang dikerjakan', icon: '📋', color: '#3b82f6' },
            { label: 'OVERDUE BULAN INI', value: kpi.overdueThisMonth, subtext: 'perlu dikerjakan', icon: '⚠️', color: '#ef4444' },
            { label: 'ADA ISU', value: kpi.issues, subtext: 'semua clear', icon: '✓', color: '#10b981' },
            { label: 'MESIN AKTIF', value: kpi.activeEquipment, subtext: 'Semua ON', icon: '⚡', color: '#3b82f6' }
          ].map((card, i) => (
            <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>{card.label}</p>
                <span style={{ fontSize: '20px' }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: card.color, marginBottom: '8px' }}>{card.value}</div>
              <p style={{ fontSize: '12px', color: kpi.overdueThisMonth > 0 && i === 1 ? '#ef4444' : '#666' }}>
                {card.subtext}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', marginBottom: '32px' }}>
          {/* Left: Categories Grid */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Kategori Pemeriksaan — {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {categoryStats.map((cat, i) => (
                <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{cat.name}</h3>
                      <p style={{ fontSize: '12px', color: '#999' }}>{cat.total} total · {cat.completed} bulan lalu</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <p>{cat.completed} record bulan ini</p>
                    <p style={{ color: '#999', marginTop: '4px' }}>Tidak ada isu</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Today's Tasks */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Tugas Hari Ini</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {recentTasks.slice(0, 6).map(task => (
                <div key={task.id} style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', borderLeft: `3px solid ${getStatusColor(task.status)}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{task.asset_id}</p>
                  <p style={{ fontSize: '11px', color: '#666' }}>{task.category}</p>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    {new Date(task.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '20px' }}>Tidak ada tugas</p>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Line Chart */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>PM Completion Trend</h3>
              <p style={{ fontSize: '12px', color: '#999' }}>Last 6 months</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Equipment Status</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie data={equipmentStatus} innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                    {equipmentStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '12px' }}>
                {equipmentStatus.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color }} />
                    <span>{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}