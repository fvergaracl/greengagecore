import Link from "next/link"

interface BreadcrumbProps {
  pageName: string
  breadcrumbPath: string
}
const Breadcrumb = ({ pageName, breadcrumbPath }: BreadcrumbProps) => {
  return (
    <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <h2 className='text-title-md2 font-semibold text-black dark:text-white'>
        {pageName}
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
