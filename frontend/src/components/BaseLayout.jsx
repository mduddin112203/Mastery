import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function BaseLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}
