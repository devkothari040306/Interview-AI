import { useState } from 'react'
import { router } from './app.routes.jsx'
import { Route, RouterProvider } from 'react-router'
import { AuthProvider } from './features/auth/auth.context.jsx'

function App() {
  
  return (
    <>
    <AuthProvider>
       < RouterProvider router={router} /> 
    </AuthProvider>
   
     </>
     )}

export default App
