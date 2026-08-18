import { Router, Route } from '@solidjs/router'
import { MockProviders } from './lib/MockProviders'
import LoginPage from './routes/login'
import RegisterPage from './routes/register'
import OnboardingPage from './routes/onboarding'
import DashboardPage from './routes/dashboard'
import ProductsPage from './routes/products'
import OutletsPage from './routes/outlets'
import StaffPage from './routes/staff'
import PaymentMethodsPage from './routes/payment-methods'
import ReportsPage from './routes/reports'
import ShiftsPage from './routes/shifts'
import SubscriptionPage from './routes/subscription'

export default function App() {
  return (
    <MockProviders>
      <Router>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/outlets" component={OutletsPage} />
        <Route path="/staff" component={StaffPage} />
        <Route path="/payment-methods" component={PaymentMethodsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/shifts" component={ShiftsPage} />
        <Route path="/subscription" component={SubscriptionPage} />
        <Route path="*" component={LoginPage} />
      </Router>
    </MockProviders>
  )
}
