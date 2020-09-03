import throttle from "lodash/throttle"
import config from "../../config"
import { lang, trigger, getURLParams, isElementInViewport } from "../../utils"
import searchAPI from "../../api/search"

class LayoutPhotos extends HTMLElement {
  constructor() {
    super()
    this.photosGridNode = this.querySelector(".layout-photos__grid")
    this.selectedThumbnail = null
    this.thumbnailsCount = 0
    this.thumbnailsLoading = false
    this.timelineNode = document.querySelector(".photos-timeline")

    // bind custom events and events
    this.bindCustomEvents()

    // bind scroll event to photos
    this.onScroll = this.onScroll.bind(this)
    this.addEventListener("scroll", throttle(this.onScroll, 200))

    // init load more button
    this.querySelector(".layout-photos__load-more").addEventListener("click", e => {
      e.currentTarget.classList.add("is-hidden")
      this.thumbnailsLoading = true
      this.loadPhotos()
    })

    // History API
    // Custom event to load content and update page meta tag
    document.addEventListener("layoutPhotos:historyPushState", e => {
      window.history.pushState(null, lang("search"), e.detail.url)
      this.onPopState(e)
    })

    // address bar changes and triggers a content refresh
    window.onpopstate = e => {
      this.onPopState(e)
    }

    // populate page content for the first time
    this.onPopState()

    // resize thumbnails when window gets resized
    window.addEventListener(
      "resize",
      throttle(() => {
        this.querySelectorAll(".photos-thumbnail").forEach(thumbnail => {
          thumbnail.resize()
        })
        this.toggleLoadMoreButton()
      }, 500).bind(this)
    )
  }

  onScroll() {
    // auto-load new items when scrolling reaches the bottom of the page
    if (
      this.scrollTop + this.offsetHeight >= this.scrollHeight &&
      !this.thumbnailsLoading &&
      this.thumbnailsCount % config.THUMBNAILS_QUERY_LIMIT === 0 &&
      this.thumbnailsCount > 0
    ) {
      this.thumbnailsLoading = true
      this.loadPhotos()
    }
  }

  showAllLoadedThumbnails() {
    this.querySelectorAll(".photos-thumbnail.is-loaded:not(.is-visible)").forEach(thumbnail => {
      thumbnail.show()
    })
  }

  toggleLoadMoreButton() {
    const bottomActions = this.querySelector(".layout-photos__bottom-actions")
    if (
      this.thumbnailsCount % config.THUMBNAILS_QUERY_LIMIT === 0 &&
      this.thumbnailsCount > 0 &&
      this.offsetHeight - this.scrollHeight >= 0
    ) {
      bottomActions.classList.remove("is-hidden")
    } else {
      bottomActions.classList.add("is-hidden")
    }
  }

  loadPhotos() {
    return new Promise((resolve, reject) => {
      const params = {}
      const defaultParams = {
        size: config.THUMBNAILS_QUERY_LIMIT,
        from: this.thumbnailsCount,
      }
      const urlParams = getURLParams()

      // merge default params with query params
      Object.assign(params, defaultParams, urlParams)

      // init timeline
      this.timelineNode.reset = { start: params.year_from, end: params.year_to }
      if (params.year) {
        this.timelineNode.disable()
      }

      if (!params.q) {
        // clear all search fields if query is not defined in the request
        trigger("inputSearch:clear")
      } else {
        // set all search fields' value if query param is set
        trigger("inputSearch:setValue", { value: params.q })
      }

      // show loading indicator
      trigger("loadingIndicator:show", { id: "LoadingIndicatorBase" })

      // search for photos
      searchAPI.search(
        params,
        data => {
          const thumbnailLoadingPromises = []
          document.querySelector(".photos-title").set(data.hits.total.value)
          data.hits.hits.forEach(itemData => {
            this.thumbnailsCount += 1
            const thumbnail = document.createElement("photos-thumbnail")
            this.photosGridNode.appendChild(thumbnail)
            thumbnailLoadingPromises.push(thumbnail.bindData(itemData))
          })

          Promise.all(thumbnailLoadingPromises).then(() => {
            this.thumbnailsLoading = false
            trigger("loadingIndicator:hide", { id: "LoadingIndicatorBase" })
            this.showAllLoadedThumbnails()
            this.toggleLoadMoreButton()
            resolve()
          })
        },
        statusText => {
          reject(statusText)
        }
      )
    })
  }

  // and load new photos when address bar url changes
  onPopState(e) {
    // Empty photosNode and reset counters when resetPhotosGrid parameter is set
    if ((e && e.detail && e.detail.resetPhotosGrid === true) || (e && e.type)) {
      while (this.photosGridNode.firstChild) {
        this.photosGridNode.firstChild.remove()
      }
      this.scrollTop = 0
      this.thumbnailsCount = 0
    }

    // load photos
    this.loadPhotos().then(() => {
      // open carousel if @id parameter is present in the url's query string
      if (getURLParams().id > 0) {
        // show carousel with an image
        if (document.querySelector(".photos-thumbnail")) document.querySelector(".photos-thumbnail").click()
      } else {
        trigger("photosCarousel:hide")
      }
    })

    // track pageview when page url changes
    // but skip tracking when page loads for the first time as GA triggers a pageview when it gets initialized
    if (e) trigger("analytics:trackPageView")
  }

  bindCustomEvents() {
    // Bind custom events
    // select next photo and open carousel
    document.addEventListener("layoutPhotos:showNextPhoto", () => {
      let next = this.selectedThumbnail.nextElementSibling
      if (next) {
        trigger("photosCarousel:hidePhotos")
        next.click()
      } else if (this.thumbnailsCount % config.THUMBNAILS_QUERY_LIMIT === 0 && this.thumbnailsCount > 0) {
        this.thumbnailsLoading = true
        this.loadPhotos().then(() => {
          next = this.selectedThumbnail.nextElementSibling
          if (next) {
            trigger("photosCarousel:hidePhotos")
            next.click()
          }
        })
      }
    })

    // select previous photo and open carousel
    document.addEventListener("layoutPhotos:showPrevPhoto", () => {
      const prev = this.selectedThumbnail.previousElementSibling
      if (prev) {
        trigger("photosCarousel:hidePhotos")
        prev.click()
      }
    })

    // set new selected thumbnail
    document.addEventListener("layoutPhotos:selectThumbnail", e => {
      if (e.detail && e.detail.node) {
        if (this.selectedThumbnail) this.selectedThumbnail.classList.remove("is-selected")
        this.selectedThumbnail = e.detail.node
        this.selectedThumbnail.classList.add("is-selected")
      }
    })

    // when carousel gets closed...
    document.addEventListener("photosCarousel:hide", () => {
      // ...scroll to thumbnail if it's not in the viewport
      if (this.selectedThumbnail) {
        if (!isElementInViewport(this.selectedThumbnail.querySelector(".photos-thumbnail__image"))) {
          this.scrollTop = this.selectedThumbnail.offsetTop - 16 - document.querySelector(".header-nav").offsetHeight
        }
      }
    })
  }
}
window.customElements.define("layout-photos", LayoutPhotos)
