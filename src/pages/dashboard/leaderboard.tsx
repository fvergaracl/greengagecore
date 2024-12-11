import DashboardLayout from "../../components/DashboardLayout"

export default function Leaderboard() {
  return (
    <DashboardLayout>
      <div className='p-6 text-center'>
        <h1 className='text-2xl font-bold text-gray-800 mb-4'>Leaderboard</h1>
        <p className='text-gray-600'>
          Consulta el ranking y compite con otros usuarios para alcanzar el
          primer lugar.
        </p>
        <div className='mt-6'>
          <ul className='bg-white shadow-md rounded-lg p-4 text-left'>
            <li className='py-2 border-b'>
              <span className='font-bold'>1. Usuario1</span> - 1200 puntos
            </li>
            <li className='py-2 border-b'>
              <span className='font-bold'>2. Usuario2</span> - 1100 puntos
            </li>
            <li className='py-2'>
              <span className='font-bold'>3. Usuario3</span> - 950 puntos
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
