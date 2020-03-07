import throttle from "lodash/throttle"
import { trigger, getURLParams } from "../../utils"

const YEAR_MIN = 1900
const YEAR_MAX = 1990

let yearStart
let yearEnd

let timelineNode
let timelineTimer
let timelineRange
let timelineSlider
let sliderSelectedRange
let sliderLeft
let sliderRight
let drag = false

let range = 0

const setURLParams = () => {
  const urlParams = getURLParams()
  urlParams.year_from = yearStart
  urlParams.year_to = yearEnd
  const url = `?${Object.entries(urlParams)
    .map(([key, val]) => `${key}=${val}`)
    .join("&")}`
  trigger("photos:historyPushState", { url })
}

const setRange = () => {
  range = timelineSlider.offsetWidth - sliderLeft.offsetWidth - sliderRight.offsetWidth
}

const getRange = () => {
  return { from: yearStart, to: yearEnd }
}

const setTimelineRange = () => {
  timelineRange.textContent = `${yearStart} — ${yearEnd}`
  sliderLeft.textContent = yearStart
  sliderRight.textContent = yearEnd
}

const fixSlider = () => {
  const start = ((yearStart - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * range
  const end = ((yearEnd - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * range
  sliderLeft.style.left = `${start}px`
  sliderRight.style.left = `${end + sliderLeft.offsetWidth}px`
  sliderSelectedRange.style.left = `${start + sliderLeft.offsetWidth}px`
  sliderSelectedRange.style.width = `${end - start}px`
}

const resetSlider = (start, end) => {
  yearStart = start
  yearEnd = end

  setRange()
  setTimelineRange()
  fixSlider()
}

const sliderStartDrag = () => {
  timelineNode.classList.add("timeline--drag")
  document.querySelector("body").classList.add("disable--selection")
  drag = true
}

const sliderStopDrag = () => {
  timelineNode.classList.remove("timeline--drag")
  document.querySelector("body").classList.remove("disable--selection")
  fixSlider()
  if (drag) {
    drag = false
    setURLParams()
  }
}

const calcYearInterval = () => {
  yearStart = YEAR_MIN + Math.round((sliderLeft.offsetLeft / range) * (YEAR_MAX - YEAR_MIN))
  yearEnd = YEAR_MIN + Math.round(((sliderRight.offsetLeft - sliderLeft.offsetWidth) / range) * (YEAR_MAX - YEAR_MIN))
}

const initSliderLeft = () => {
  let down = false
  let ox = 0

  sliderLeft.addEventListener("mousedown", e => {
    down = true
    ox = e.pageX - sliderLeft.offsetLeft
    sliderLeft.classList.add("timeline__slider--active")
    sliderStartDrag()
  })

  document.addEventListener("mousemove", e => {
    if (
      down &&
      sliderLeft.offsetLeft >= 0 &&
      sliderLeft.offsetLeft <= sliderRight.offsetLeft - sliderLeft.offsetWidth
    ) {
      const x = Math.min(Math.max(e.pageX - ox, 0), sliderRight.offsetLeft - sliderLeft.offsetWidth)
      sliderLeft.style.left = `${x}px`
      sliderSelectedRange.style.left = `${x + sliderLeft.offsetWidth}px`
      sliderSelectedRange.style.width = `${sliderRight.offsetLeft - x}px`
      calcYearInterval()
      setTimelineRange()
    }
  })

  document.addEventListener("mouseup", () => {
    down = false
    sliderLeft.classList.remove("timeline__slider--active")
    sliderStopDrag()
  })
}

const initSliderRight = () => {
  let down = false
  let ox

  sliderRight.addEventListener("mousedown", e => {
    down = true
    ox = e.pageX - sliderRight.offsetLeft
    sliderRight.classList.add("timeline__slider--active")
    sliderStartDrag()
  })

  document.addEventListener("mousemove", e => {
    if (
      down &&
      sliderRight.offsetLeft >= sliderLeft.offsetLeft + sliderLeft.offsetWidth &&
      sliderRight.offsetLeft <= timelineSlider.offsetWidth - sliderRight.offsetWidth
    ) {
      const x = Math.max(
        Math.min(e.pageX - ox, timelineSlider.offsetWidth - sliderRight.offsetWidth),
        sliderLeft.offsetLeft + sliderLeft.offsetWidth
      )
      sliderRight.style.left = `${x}px`
      sliderSelectedRange.style.width = `${sliderRight.offsetLeft - sliderLeft.offsetLeft}px`
      calcYearInterval()
      setTimelineRange()
    }
  })

  document.addEventListener("mouseup", () => {
    down = false
    sliderRight.classList.remove("timeline__slider--active")
    sliderStopDrag()
  })
}

const disable = () => {
  if (timelineNode) timelineNode.classList.remove("timeline--show")
  if (timelineNode) timelineNode.classList.add("timeline--disabled")
}

const init = (start = YEAR_MIN, end = YEAR_MAX) => {
  if (timelineNode) {
    timelineNode.classList.remove("timeline--disabled")
    timelineNode.classList.add("timeline--show")
    resetSlider(start, end)
  }

  timelineNode = document.querySelector(".timeline")
  timelineRange = document.querySelector("#TimelineRange")
  timelineSlider = document.querySelector("#TimelineSlider")
  sliderSelectedRange = document.querySelector("#TimelineSliderSelectedRange")
  sliderLeft = document.querySelector("#TimelineSliderLeft")
  sliderRight = document.querySelector("#TimelineSliderRight")

  resetSlider(start, end)

  initSliderLeft()
  initSliderRight()

  // show/hide timeline
  document.addEventListener(
    "mousemove",
    throttle(e => {
      if (
        !timelineNode.classList.contains("timeline--show") &&
        !timelineNode.classList.contains("timeline--disabled")
      ) {
        timelineNode.classList.add("timeline--show")
      }

      if (timelineTimer) clearTimeout(timelineTimer)
      timelineTimer = setTimeout(() => {
        const bounds = timelineNode.getBoundingClientRect()
        if (
          !(
            e.clientX >= bounds.left &&
            e.clientX <= bounds.right &&
            e.clientY >= bounds.top &&
            e.clientY <= bounds.bottom
          )
        ) {
          timelineNode.classList.remove("timeline--show")
        }
      }, 1000)
    }, 400)
  )
}

export default {
  init,
  getRange,
  disable,
}
