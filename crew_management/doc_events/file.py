# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from six.moves.urllib.parse import quote
import frappe
from frappe import _


def before_insert(self, method):
    if not self.is_folder and self.attached_to_doctype == "Job":
        if self.content_type and "image/" in self.content_type:
            self.add_comment_in_reference_doc(
                'Attachment', _('{0}').format("<img class='job-activity-image' src='{file_url}'/>".format(
                    **{
                        "file_url": quote(frappe.safe_encode(self.file_url)) if self.file_url else self.file_name
                    }))
            )
