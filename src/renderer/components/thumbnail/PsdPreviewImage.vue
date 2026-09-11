<template>
  <img
    :src="src"
    name="dragItem"
    width="200px"
    height="130px"
    loading="lazy"
    decoding="async"
  />
</template>

<script>
import { loadPsdThumbnailDataUrl } from '@/utils/psdLoader'

export default {
  name: 'PsdPreviewImage',
  props: {
    path: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      src: '',
      loadToken: 0
    }
  },
  watch: {
    path() {
      this.loadPreview()
    }
  },
  mounted() {
    this.loadPreview()
  },
  beforeDestroy() {
    this.previewDestroyed = true
    this.loadToken += 1
  },
  methods: {
    async loadPreview() {
      const token = ++this.loadToken
      this.src = ''
      try {
        const src = await loadPsdThumbnailDataUrl(this.path)
        if (token === this.loadToken && !this.previewDestroyed) this.src = src
      } catch (error) {
        if (token === this.loadToken) console.warn('PSD gallery thumbnail load failed', this.path, error)
      }
    }
  }
}
</script>
