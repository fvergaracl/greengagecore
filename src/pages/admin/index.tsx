import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCircle,
  faUser,
  faMapMarkerAlt,
  faTasks,
  faFlag
} from "@fortawesome/free-solid-svg-icons"
import { useTranslation } from "@/hooks/useTranslation"
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb"
import DefaultLayout from "../../components/AdminLayout"

export default function Admin() {
  const { t } = useTranslation()
  return (
    <DefaultLayout>
      <Breadcrumb pageName={t("System Overview")} breadcrumbPath='Home' />
      <div className='min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'>
        <div className='container mx-auto py-12 px-6'>
          <p className='text-lg text-center mb-12'>
            {t(
              "Explore how entities like Campaigns, Areas, POIs, Tasks, and Users are interrelated within the system. Campaigns have multiple Areas, Areas contain multiple POIs, and each POI can have multiple Tasks"
            )}
          </p>

          {/* Graph Representation */}
          <div className='flex justify-center mb-16'>
            <div className='bg-white dark:bg-gray-800 shadow-lg p-8 rounded-lg'>
              <h2
                className='text-2xl font-semibold text-center mb-6'
                data-cy='system-overview-title'
              >
                {t("Entity Relationships")}
              </h2>
              <div
                className='flex justify-center'
                data-cy='system-overview-graph'
              >
                <svg viewBox='0 0 800 600' className='w-full h-96'>
                  {/* Campaign Node */}
                  <circle cx='400' cy='50' r='40' className='fill-blue-500' />
                  <text
                    x='400'
                    y='55'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Campaign")}
                  </text>

                  {/* Area Nodes */}
                  <circle cx='200' cy='200' r='40' className='fill-green-500' />
                  <text
                    x='200'
                    y='205'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Area")} 1
                  </text>

                  <circle cx='600' cy='200' r='40' className='fill-green-500' />
                  <text
                    x='600'
                    y='205'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Area")} N
                  </text>

                  {/* POI Nodes */}
                  <circle
                    cx='150'
                    cy='350'
                    r='40'
                    className='fill-yellow-500'
                  />
                  <text
                    x='150'
                    y='355'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    POI 1
                  </text>

                  <circle
                    cx='250'
                    cy='350'
                    r='40'
                    className='fill-yellow-500'
                  />
                  <text
                    x='250'
                    y='355'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    POI M
                  </text>

                  <circle
                    cx='550'
                    cy='350'
                    r='40'
                    className='fill-yellow-500'
                  />
                  <text
                    x='550'
                    y='355'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    POI 1
                  </text>

                  <circle
                    cx='650'
                    cy='350'
                    r='40'
                    className='fill-yellow-500'
                  />
                  <text
                    x='650'
                    y='355'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    POI L
                  </text>

                  {/* Task Nodes */}
                  <circle cx='150' cy='500' r='40' className='fill-red-500' />
                  <text
                    x='150'
                    y='505'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Task")} 1
                  </text>

                  <circle cx='250' cy='500' r='40' className='fill-red-500' />
                  <text
                    x='250'
                    y='505'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Task")} 2
                  </text>

                  <circle cx='350' cy='500' r='40' className='fill-red-500' />
                  <text
                    x='350'
                    y='505'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Task")} O
                  </text>

                  <circle cx='550' cy='500' r='40' className='fill-red-500' />
                  <text
                    x='550'
                    y='505'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Task")} 1
                  </text>

                  <circle cx='650' cy='500' r='40' className='fill-red-500' />
                  <text
                    x='650'
                    y='505'
                    textAnchor='middle'
                    fill='white'
                    fontSize='16'
                  >
                    {t("Task")} P
                  </text>

                  <line
                    x1='400'
                    y1='90'
                    x2='200'
                    y2='160'
                    className='stroke-blue-300 stroke-2'
                  />
                  <line
                    x1='400'
                    y1='90'
                    x2='600'
                    y2='160'
                    className='stroke-blue-300 stroke-2'
                  />
                  <line
                    x1='200'
                    y1='240'
                    x2='150'
                    y2='310'
                    className='stroke-green-300 stroke-2'
                  />
                  <line
                    x1='200'
                    y1='240'
                    x2='250'
                    y2='310'
                    className='stroke-green-300 stroke-2'
                  />
                  <line
                    x1='600'
                    y1='240'
                    x2='550'
                    y2='310'
                    className='stroke-green-300 stroke-2'
                  />
                  <line
                    x1='600'
                    y1='240'
                    x2='650'
                    y2='310'
                    className='stroke-green-300 stroke-2'
                  />
                  <line
                    x1='150'
                    y1='390'
                    x2='150'
                    y2='460'
                    className='stroke-yellow-300 stroke-2'
                  />
                  <line
                    x1='150'
                    y1='390'
                    x2='250'
                    y2='460'
                    className='stroke-yellow-300 stroke-2'
                  />
                  <line
                    x1='250'
                    y1='390'
                    x2='350'
                    y2='460'
                    className='stroke-yellow-300 stroke-2'
                  />
                  <line
                    x1='550'
                    y1='390'
                    x2='550'
                    y2='460'
                    className='stroke-yellow-300 stroke-2'
                  />
                  <line
                    x1='650'
                    y1='390'
                    x2='650'
                    y2='460'
                    className='stroke-yellow-300 stroke-2'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className='space-y-12' data-cy='system-overview-description'>
            <div className='flex items-center gap-6'>
              <FontAwesomeIcon
                icon={faFlag}
                className='text-blue-500 text-3xl'
              />
              <div>
                <h3 className='text-2xl font-semibold'>{t("Campaigns")}</h3>
                <p>
                  {t(
                    "Campaigns represent overarching projects. Each campaign can contain one or many areas to organize tasks geographically"
                  )}
                  .
                </p>
              </div>
            </div>

            {/* Areas */}
            <div className='flex items-center gap-6'>
              <FontAwesomeIcon
                icon={faMapMarkerAlt}
                className='text-green-500 text-3xl'
              />
              <div>
                <h3 className='text-2xl font-semibold'>{t("Areas")}</h3>
                <p>
                  {t(
                    "Areas define specific regions within a campaign. Each area can include one or more Points of Interest (POIs)"
                  )}
                  .
                </p>
              </div>
            </div>

            {/* POIs */}
            <div className='flex items-center gap-6'>
              <FontAwesomeIcon
                icon={faCircle}
                className='text-yellow-500 text-3xl'
              />
              <div>
                <h3 className='text-2xl font-semibold'>
                  {t("Points of Interest (POIs)")}
                </h3>
                <p>
                  {t(
                    "POIs are precise locations within an area where specific tasks can be assigned. Each POI can contain multiple tasks"
                  )}
                  .
                </p>
              </div>
            </div>

            {/* Tasks */}
            <div className='flex items-center gap-6'>
              <FontAwesomeIcon
                icon={faTasks}
                className='text-red-500 text-3xl'
              />
              <div>
                <h3 className='text-2xl font-semibold'>{t("Tasks")}</h3>
                <p>
                  {t(
                    "Tasks define the actions to be completed at a POI, such as filling surveys or performing specific actions"
                  )}
                  .
                </p>
              </div>
            </div>

            {/* Users */}
            <div className='flex items-center gap-6'>
              <FontAwesomeIcon
                icon={faUser}
                className='text-purple-500 text-3xl'
              />
              <div>
                <h3 className='text-2xl font-semibold'>{t("Users")}</h3>
                <p>
                  {t(
                    "Users interact with the system by completing tasks and contributing data. They can also manage campaigns if granted permission"
                  )}
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  )
}
