import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useGetAdminStats, getGetAdminStatsQueryKey,
  useListAdminPayments, getListAdminPaymentsQueryKey,
  useGetTeamBreakdown, getGetTeamBreakdownQueryKey,
} from "@workspace/api-client-react";
import { TEAMS } from "@/lib/teams";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { data: stats, isLoading: loadingStats } = useGetAdminStats({ query: { enabled: isAuthenticated, queryKey: getGetAdminStatsQueryKey() } });
  const { data: paymentsData, isLoading: loadingPayments } = useListAdminPayments({ limit: 50 }, { query: { enabled: isAuthenticated, queryKey: getListAdminPaymentsQueryKey({ limit: 50 }) } });
  const { data: breakdown, isLoading: loadingBreakdown } = useGetTeamBreakdown({ query: { enabled: isAuthenticated, queryKey: getGetTeamBreakdownQueryKey() } });

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "worldcapo2026") {
      sessionStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <Card className="w-full max-w-md border-primary/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center uppercase tracking-wider">Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  type="password" 
                  placeholder="Enter password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50"
                />
                {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              </div>
              <Button type="submit" className="w-full uppercase tracking-widest font-bold">Login</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = breakdown?.slice(0, 10).map(b => {
    const team = TEAMS.find(t => t.id === b.teamId);
    return {
      name: team?.name || b.teamId,
      flags: b.flagCount,
      revenue: b.revenue
    };
  }) || [];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />
      
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Command Center</h1>
          <p className="text-muted-foreground">Live overview of World Capo performance</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {loadingStats ? "..." : `€${stats?.totalRevenue.toFixed(2)}`}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Total Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {loadingStats ? "..." : stats?.totalFlags.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">
                {loadingStats ? "..." : `${stats?.successRate.toFixed(1)}%`}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <Card className="bg-card/50 border-border/50 col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="uppercase tracking-widest text-sm text-muted-foreground">Top 10 Teams Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {loadingBreakdown ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} />
                      <YAxis stroke="#888" tick={{fill: '#888'}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="flags" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Flags Placed" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card className="bg-card/50 border-border/50 col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="uppercase tracking-widest text-sm text-muted-foreground">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="uppercase tracking-wider text-xs">Date</TableHead>
                      <TableHead className="uppercase tracking-wider text-xs">Team</TableHead>
                      <TableHead className="uppercase tracking-wider text-xs text-right">Amount</TableHead>
                      <TableHead className="uppercase tracking-wider text-xs text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayments ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading payments...</TableCell>
                      </TableRow>
                    ) : paymentsData?.payments.map(payment => (
                      <TableRow key={payment.id} className="border-border/50 hover:bg-white/5">
                        <TableCell className="font-mono text-sm">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{TEAMS.find(t => t.id === payment.teamId)?.name || payment.teamId}</TableCell>
                        <TableCell className="text-right font-mono">€{(payment.amountCents / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={payment.status === 'succeeded' ? 'default' : payment.status === 'failed' ? 'destructive' : 'secondary'}
                                 className={payment.status === 'succeeded' ? 'bg-accent text-accent-foreground' : ''}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
