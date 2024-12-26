import Link from "next/link"

interface BreadcrumbProps {
  icon?: React.ReactNode
  pageName: string
  breadcrumbPath: string
}
const Breadcrumb = ({ icon, pageName, breadcrumbPath }: BreadcrumbProps) => {
  return (
    <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <h2 className='text-title-md2 font-semibold text-black dark:text-white flex items-center space-x-2'>
        {icon && <span>{icon}</span>}
        <span>{pageName}</span>
      </h2>

      <nav>
        <ol className='flex items-center gap-2'>
          <li>
            <Link
              href='/admin'
              className='text-primary font-medium duration-300 ease-in-out hover:text-primarydark dark:hover:text-primarylight'
            >
              Dashboard /
            </Link>
          </li>
          <li className='font-medium text-primary'>{breadcrumbPath}</li>
        </ol>
      </nav>
    </div>
  )
}

export default Breadcrumb
