import { Controller } from "stimulus"
import { trigger, getURLParams } from "../../js/utils"
import { setAppState, removeAppState } from "../../js/app"

const YEAR_MIN = 1900
const YEAR_MAX = 1990

export default class extends Controller {
  static get targets() {
    return ["title", "range", "slider", "selectedRange", "sliderKnob", "sliderYear"]
  }

  connect() {
    this.range = 0 // distance between the two knobs

    // slider status
    this.sliderDragged = null
    this.sliderDragStartX = 0

    // init component
    this.resetSlider()
  }

  enable() {
    this.element.classList.remove("is-disabled")
    this.element.classList.add("is-visible")
  }

  disable() {
    this.element.classList.remove("is-visible")
    this.element.classList.add("is-disabled")
  }

  /**
   * Change the address bar url params based on the timeline's range
   */
  setURLParams() {
    const urlParams = getURLParams()
    urlParams.year = this.yearStart
    const url = `?${Object.entries(urlParams)
      .map(([key, val]) => `${key}=${val}`)
      .join("&")}`
    trigger("photos:historyPushState", { url })
  }

  setRange() {
    this.range = this.sliderTarget.offsetWidth - this.sliderYearTarget.offsetWidth
  }

  getRange() {
    return { from: YEAR_MIN, to: this.year }
  }

  setTimelineRange() {
    this.rangeTarget.textContent = this.year
    this.sliderYearTarget.textContent = this.year
  }

  fixSlider() {
    const start = ((this.year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * this.range
    this.sliderYearTarget.style.left = `${start}px`
    this.selectedRangeTarget.style.width = `${start + this.sliderYearTarget.offsetWidth}px`
    this.selectedRangeTarget.style.left = `${start}px`
  }

  resetSlider() {
    const urlParams = getURLParams()

    this.year = urlParams.year || YEAR_MIN

    this.setRange()
    this.setTimelineRange()
    this.fixSlider()

    this.enable()
  }

  calcYear() {
    return
    this.yearStart = YEAR_MIN + Math.round((this.sliderLeftTarget.offsetLeft / this.range) * (YEAR_MAX - YEAR_MIN))
    this.yearEnd =
      YEAR_MIN +
      Math.round(
        ((this.sliderRightTarget.offsetLeft - this.sliderLeftTarget.offsetWidth) / this.range) * (YEAR_MAX - YEAR_MIN)
      )
  }

  sliderStartDrag(e) {
    e.currentTarget.classList.add("is-active")
    const px = e.touches ? e.touches[0].pageX : e.pageX
    this.sliderDragStartX = px - e.currentTarget.offsetLeft

    this.element.classList.add("is-used")
    setAppState("disable--selection")
    this.sliderDragged = e.currentTarget
  }

  sliderStopDrag() {
    this.sliderKnobTargets.forEach(knob => {
      knob.classList.remove("is-active")
    })

    this.element.classList.remove("is-used")
    removeAppState("disable--selection")

    this.fixSlider()

    if (this.sliderDragged) {
      this.sliderDragged = null
      this.setURLParams()
    }
  }

  sliderYearMoved(e) {
    if (
      this.sliderDragged === this.sliderYearTarget &&
      this.sliderYearTarget.offsetLeft >= 0 // &&
      // this.sliderYearTarget.offsetLeft <= this.sliderRightTarget.offsetLeft - this.sliderYearTarget.offsetWidth
    ) {
      const px = e.touches ? e.touches[0].pageX : e.pageX
      const x = Math.min(
        Math.max(px - this.sliderDragStartX, 0),
        this.sliderRightTarget.offsetLeft - this.sliderYearTarget.offsetWidth
      )
      this.sliderYearTarget.style.left = `${x}px`
      this.selectedRangeTarget.style.left = `${x + this.sliderYearTarget.offsetWidth}px`
      this.selectedRangeTarget.style.width = `${this.sliderRightTarget.offsetLeft - x}px`

      this.calcYearRange()
      this.setTimelineRange()
    }
  }
}
