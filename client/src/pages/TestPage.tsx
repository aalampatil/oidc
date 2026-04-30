import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const TestPage = () => {

  const [searchParams] = useSearchParams()

  useEffect(() => {
    console.log("Mounted")

    const params = Object.fromEntries(searchParams.entries())
    console.log(params)
  }, [searchParams])
  return (
    <div>TestPage</div>
  )
}

export default TestPage