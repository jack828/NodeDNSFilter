/*---LEFT BAR ACCORDION----*/
$(document).on('ready', function () {
  $('#nav-accordion').dcAccordion({
      eventType: 'click'
    , autoClose: true
    , saveState: true
    , disableLink: true
    , speed: 'slow'
    , showCount: false
    , autoExpand: true
    , classExpand: 'dcjq-current-parent'
  })
})

$(document).on('ready', function () {
  // sidebar dropdown menu auto scrolling

  $('#sidebar .sub-menu > a').click(function () {
    var o = ($(this).offset())
      , diff = 250 - o.top
    if (diff > 0) {
      $('#sidebar').scrollTo('-=' + Math.abs(diff), 500)
    } else {
      $('#sidebar').scrollTo('+=' + Math.abs(diff), 500)
    }
  })

  // sidebar toggle

  $(function () {
    function responsiveView () {
      var wSize = $(window).width()
      if (wSize <= 768) {
        $('#container').addClass('sidebar-close')
        $('#sidebar > ul').hide()
      }

      if (wSize > 768) {
        $('#container').removeClass('sidebar-close')
        $('#sidebar > ul').show()
      }
    }
    $(window).on('load', responsiveView)
    $(window).on('resize', responsiveView)
  })

  $('.js-sidebar-toggle').click(function () {
    if ($('#sidebar > ul').is(':visible') === true) {
      $('#main-content').css({
        'margin-left': '0px'
      })
      $('#sidebar').css({
        'margin-left': '-210px'
      })
      $('#sidebar > ul').hide()
      $('#container').addClass('sidebar-closed')
    } else {
      $('#main-content').css({
        'margin-left': '210px'
      })
      $('#sidebar > ul').show()
      $('#sidebar').css({
        'margin-left': '0'
      })
      $('#container').removeClass('sidebar-closed')
    }
  })

  // widget tools
  $('.panel .tools .fa-chevron-down').click(function () {
    var el = $(this).parents('.panel').children('.panel-body')
    if ($(this).hasClass('fa-chevron-down')) {
      $(this).removeClass('fa-chevron-down').addClass('fa-chevron-up')
      el.slideUp(200)
    } else {
      $(this).removeClass('fa-chevron-up').addClass('fa-chevron-down')
      el.slideDown(200)
    }
  })

  $('.panel .tools .fa-times').click(function () {
    $(this).parents('.panel').parent().remove()
  })

  // tool tips
  $('.tooltips').tooltip()

  // popovers
  $('.popovers').popover()

  // custom bar chart

  if ($('.custom-bar-chart')) {
    $('.bar').each(function () {
      var i = $(this).find('.value').html()
      $(this).find('.value').html('')
      $(this).find('.value').animate({
        height: i
      }, 2000)
    })
  }

  // Form buttons
  $('.js-config-general--form :input').one('input', function () {
    $('.js-config-general--save')
        .removeAttr('disabled')
        .removeClass('btn-default')
        .addClass('btn-theme')
  })

  $('.js-config-general--save').on('click', function (e) {
    e.preventDefault()
    var adminUrl = $('.js-config-general--adminUrl').val()
      , dnsAuthority = $('.js-config-general--dnsAuthority').val()
    $.ajax({
      url: '/api/set'
    , method: 'POST'
    , data:
      { adminUrl: adminUrl
      , dnsAuthority: dnsAuthority
      }
    , success: function () {
        $('.js-config-general--success').removeClass('hidden')
        setTimeout(function () {
          if (window.location.host !== adminUrl) {
            window.location.host = adminUrl
          } else {
            window.location.reload(true)
          }
        }, 3000)
      }
    , error: function (jqXHR) {
        var $errorPanel = $('.js-config-general--error')
        $errorPanel.find('p').text(jqXHR.responseText)
        $errorPanel.removeClass('hidden')
      }
    })
  })

  // White/black list buttons
  $('.js-config-whitelist--submit').on('click', function (e) {
    e.preventDefault()
    var $formGroup = $(this).parent().parent()
      , url = $formGroup.find('.js-config-whitelist--url').val()
      , validator = validateUrl(url)
      , hostname = getHostname(url)

    if (validator) {
      $.ajax({
        url: '/api/set/whitelist/' + encodeURIComponent(url)
      , method: 'PUT'
      , success: function () {
          window.location.reload()
        }
      , error: function (jqXHR) {
          var $errorPanel = $('.js-config-whitelist--error')
          $errorPanel.find('p').text(jqXHR.responseText)
          $errorPanel.removeClass('hidden')
        }
      })
    } else {
    }
  })

  $('.js-config-blacklist--submit').on('click', function (e) {
    e.preventDefault()
    var $formGroup = $(this).parent().parent()
      , url = $formGroup.find('.js-config-blacklist--url').val()
      , validator = validateUrl(url)
      , hostname = getHostname(url)

    console.log('validator', validator, hostname)
    if (validator) {
      $.ajax({
        url: '/api/set/blacklist/' + encodeURIComponent(url)
      , method: 'PUT'
      , success: function () {
          window.location.reload()
        }
      , error: function (jqXHR) {
          var $errorPanel = $('.js-config-blacklist--error')
          $errorPanel.find('p').text(jqXHR.responseText)
          $errorPanel.removeClass('hidden')
        }
      })
    } else {
    }
  })

  function validateUrl (url) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '(([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}', 'i') // fragment locater
    if (!pattern.test(url)) {
      return false
    } else {
      return true
    }
  }

  function getHostname (url) {
    if (!/^https?:\/\//.exec(url)) {
      url = 'http://' + url
    }
    var parser = document.createElement('a')
    parser.href = url
    return parser.hostname
  }

  // Load the lists after page load
  $.ajax({
    url: '/api/get/whitelist'
  , method: 'GET'
  , success: function (body) {
      var urls = body.split('\n')
      urls.forEach(function (url) {
        var row = '<tr data-listname="whitelist">'
        row += '<td class="js-whitelist--remove-url"><i class="fa fa-remove"></i></td>'
        row += '<td>' + url + '</td></tr>'
        $('.js-config-whitelist--table').append(row)
      })
      $('.js-whitelist--remove-url').on('click', removeUrl)
  }
  , error: function (jqXHR) {
      var $errorPanel = $('.js-config-whitelist--error')
      $errorPanel.find('p').text(jqXHR.responseText)
      $errorPanel.removeClass('hidden')
    }
  })

  $.ajax({
    url: '/api/get/blacklist'
  , method: 'GET'
  , success: function (body) {
      var urls = body.split('\n')
      urls.forEach(function (url) {
        var row = '<tr data-listname="blacklist">'
        row += '<td class="js-blacklist--remove-url"><i class="fa fa-remove"></i></td>'
        row += '<td>' + url + '</td></tr>'
        $('.js-config-blacklist--table').append(row)
      })
      $('.js-blacklist--remove-url').on('click', removeUrl)
  }
  , error: function (jqXHR) {
      var $errorPanel = $('.js-config-blacklist--error')
      $errorPanel.find('p').text(jqXHR.responseText)
      $errorPanel.removeClass('hidden')
    }
  })

  function removeUrl () {
    var $tableRow = $(this).parent()
      , listname = $tableRow.data('listname')
      , urlCell = $tableRow.children()[1]
      , url = $(urlCell).text()

    $.ajax({
      url: '/api/delete/' + listname + '/' + encodeURIComponent(url)
    , method: 'DELETE'
    , success: function () {
        $tableRow.remove()
      }
    , error: function (jqXHR) {
        var $errorPanel = $('.js-config-' + listname + '--error')
        $errorPanel.find('p').text(jqXHR.responseText)
        $errorPanel.removeClass('hidden')
      }
    })
  }
})
