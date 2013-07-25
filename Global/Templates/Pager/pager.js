jQuery.fn.outerHTML = function(s) {
    return (s)
            ? this.before(s).remove()
            : jQuery("<p>").append(this.eq(0).clone()).html();
};

var hasher = new Hasher;

$(window).load(function() {
    hasher.initialize();
    Pagers = new PagerList;
    Pagers.initialize();
});


function Hasher() {
    $this = this;
    this.values = new Object;
    this.full_hash = window.location.hash;

    this.initialize = function()
    {
        // ignore empty hash
        if (this.full_hash.length < 2) {
            return;
        }

        var hash = this.full_hash.replace(/^#/, '');
        var hash_array = hash.split('&');
        hash_array.forEach(function(data) {
            var key_val = hash.split('=');
            var pager_id = key_val.shift();
            var pager_values = key_val.shift();
            var sub_values = pager_values.split(';');
            sub_values.forEach(function(sub) {
                var tsub = sub.split(':');
                if ($this.values[pager_id] === undefined) {
                    $this.values[pager_id] = new Object;
                }
                $this.values[pager_id][tsub[0]] = tsub[1];
            });
        });
    };

    this.getValue = function(pager_id, key)
    {
        if (this.values[pager_id] === undefined) {
            return;
        }
        return this.values[pager_id][key];
    };
}


function PagerList() {
    this.pagers = new Object;
    this.pager_ids = new Array;
    var $this = this;

    this.initialize = function()
    {
        this.loadPagers();
    };

    /**
     * loads all pager on the current page
     * @returns {undefined}
     */
    this.loadPagers = function()
    {
        $('.pager').each(function() {
            var pager = new Pager($(this));
            pager.initialize();
            if (pager.rows !== undefined) {
                $this.pagers[pager.id] = pager;
                $this.pager_ids.push(pager.id);
            }
        });
    };

    this.sortHeaderClick = function()
    {
        $('.sort-header').click(function() {
            var column_name = $(this).attr('data-column-name');
            var direction = $(this).attr('data-direction');
            var pager_id = $(this).parents('.pager', this).attr('id');
            var current_icon = $('i', this);
            $('.sort-header i').attr('class', 'icon-stop');
            $('.sort-header').attr('data-direction', 4);
            switch (direction) {
                case '4':
                    $(this).attr('data-direction', 3);
                    current_icon.attr('class', 'icon-arrow-up');
                    break;
                case '3':
                    $(this).attr('data-direction', 0);
                    current_icon.attr('class', 'icon-arrow-down');
                    break;
                case '0':
                    $(this).attr('data-direction', 4);
                    current_icon.attr('class', 'icon-stop');
                    break;
            }
            $this.setSort(pager_id, column_name, direction);
            $this.processData(pager_id);
        });
    };

    this.pageChangeClick = function()
    {
        $('.pager-page-no').click(function() {
            var pager_id = $(this).parents('.pager', this).attr('id');
            var current_page = $(this).data('pageNo');
            $this.setCurrentPage(pager_id, current_page);
            $this.processData(pager_id);
        });
    };

    this.searchClick = function() {
        $this = this;
        $('.pager-search-submit').click(function() {
            var pager_id = $(this).parents('.pager', this).attr('id');
            $this.setCurrentSearch(pager_id);
        });
    };

    this.setCurrentSearch = function(pager_id) {
        this.pagers[pager_id].loadSearch();
    }

    this.processData = function(pager_id) {
        this.pagers[pager_id].processData();
    };


    this.fillRows = function() {
        $this = this;
        this.pager_ids.forEach(function(val) {
            var pager = $this.pagers[val];
        });
    };

    this.setCurrentPage = function(pager_id, current_page) {
        this.pagers[pager_id].setCurrentPage(current_page);
    };

    this.setSort = function(pager_id, column_name, direction) {
        this.pagers[pager_id].setSort(column_name, direction);
    };
}

function Pager(page) {
    var $this = this;

    this.page = page;
    this.id = this.page.attr('id');
    this.sort_by = '';
    this.direction = 0;
    this.rows_per_page = 10;
    this.current_page = 1;
    this.page_listing = '';
    this.search_box = '';
    this.search_phrase = '';
    this.search_column = '';
    this.current_url = '';
    this.row_template = '';
    this.headers = '';
    this.header_template = '';

    this.initialize = function() {
        this.sort_by = hasher.getValue(this.id, 's');
        this.direction = hasher.getValue(this.id, 'd');
        this.rows_per_page = hasher.getValue(this.id, 'rpp');
        this.current_page = hasher.getValue(this.id, 'cp');
        this.search_phrase = hasher.getValue(this.id, 'sp');
        this.search_column = hasher.getValue(this.id, 'sc');

        this.current_url = this.currentURL();
        this.loadRowsPerPage();
        this.loadRowTemplate();
        this.loadHeaderTemplate();
        this.processData();
    };

    this.loadSearch = function() {
        var search_phrase = $('.search-query', this.page).val();
        this.search_phrase = search_phrase.replace(/[^\w\s]/gi, '');
    };

    this.loadRowsPerPage = function() {
        if (this.rows_per_page > 0) {
            return;
        }
        rpp = hasher.getValue(this.pager_id, 'rpp');
        if (rpp > 0) {
            this.rows_per_page = rpp;
        } else {
            this.rows_per_page = this.page.data('rpp');
        }
    };

    this.loadRowTemplate = function() {
        this.row_template = $('#' + this.id + ' .pager-row');
        this.row_template.remove();
    };

    this.loadHeaderTemplate = function()
    {
        this.header_template = $('#' + this.id + ' .pager-header');
    };

    this.processData = function()
    {
        this.clearRows();
        this.loadData();
        if (this.rows === undefined) {
            $('.pager-listing', this.page).html('No result found.');
        }
    };

    /**
     * Accesses the current page with a JSON request to receive pager data.
     * @returns void
     */
    this.loadData = function() {
        $.ajax({
            'url': this.current_url,
            'dataType': 'json',
            'data': {
                'pager_id': $this.id,
                'sort_by': this.sort_by,
                'direction': this.direction,
                'rpp': this.rows_per_page,
                'current_page': this.current_page,
                'search_phrase': this.search_phrase,
                'search_column': this.search_column
            },
            'async': false,
            'success': function(data) {
                if (data.error || data.rows.length < 1) {
                    return;
                } else {
                    $this.importContent(data);
                    $this.insertContent();
                    Pagers.sortHeaderClick();
                    Pagers.pageChangeClick();
                    Pagers.searchClick();
                }
            }
        });
    };


    this.importContent = function(data) {
        this.rows = data.rows;
        this.page_listing = data.page_listing;
        this.search_box = data.pager_search;
        this.headers = data.headers;
    };

    this.setCurrentPage = function(current_page)
    {
        this.current_page = current_page;
    };

    this.clearRows = function()
    {
        $('#' + this.id + ' .pager-row').remove();
    };

    this.setSort = function(column_name, direction)
    {
        this.sort_by = column_name;
        this.direction = direction;
    };

    this.currentURL = function() {
        var unfiltered_url = document.URL;
        return unfiltered_url.replace(/\&.*$/g, '');
    };

    /**
     * Fills in the template with data pulled from loadData
     * @returns void
     */
    this.insertContent = function() {
        this.rows.forEach(function(row) {
            new_row = $this.row_template.clone();

            for (var key in row) {
                var cname = '.' + key;
                $(cname, new_row).html(row[key]);
            }
            $('.pager-body').append(new_row.outerHTML());
        });
        $('.pager-listing', this.page).html(this.page_listing);
        $('.pager-search', this.page).html(this.search_box);
        this.fillHeader();
    };

    this.fillHeader = function() {
        $.each(this.headers, function(key, value) {
            var class_name = '.pager-header.' + key;
            $(class_name, this.header_template).html(value);
        });
    };

}